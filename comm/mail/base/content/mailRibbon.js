/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* globals commandController, gDBView, gFolder, threadTree, MailServices */

/**
 * The actions card at the top of the mail view, modelled on the Outlook
 * ribbon. Each button names its action in data-action.
 */
var mailRibbon = {
  /** Actions that map directly onto a message command. */
  COMMANDS: {
    "new-message": "cmd_newMessage",
    ignore: "cmd_killThread",
    delete: "cmd_delete",
    archive: "cmd_archive",
    report: "cmd_markAsJunk",
    reply: "cmd_reply",
    "reply-all": "cmd_replyall",
    forward: "cmd_forward",
    "mark-all-read": "cmd_markAllRead",
    flag: "cmd_markAsFlagged",
    print: "cmd_print",
  },

  /** Actions that need at least one selected message. */
  NEEDS_SELECTION: new Set(["block", "sweep", "move", "categorize"]),

  init() {
    this.ribbon = document.getElementById("mailRibbon");
    this.movePopup = document.getElementById("mailRibbonMovePopup");
    this.rulesPopup = document.getElementById("mailRibbonRulesPopup");
    this.tagPopup = document.getElementById("mailRibbonTagPopup");

    this.ribbon.addEventListener("click", event => {
      const button = event.target.closest("button[data-action]");
      if (button && !button.disabled) {
        this.doAction(button.dataset.action, button, event);
      }
    });
    this.movePopup.addEventListener("command", event => {
      commandController.doCommand("cmd_moveMessage", event.target._folder);
    });
    document
      .getElementById("mailRibbonCreateRule")
      .addEventListener("command", () =>
        commandController.doCommand("cmd_createFilterFromMenu")
      );
    document
      .getElementById("mailRibbonManageRules")
      .addEventListener("command", () => top.MsgFilters());
    document
      .getElementById("mailRibbonAddTag")
      .addEventListener("command", () =>
        commandController.doCommand("cmd_addTag")
      );
    document
      .getElementById("mailRibbonManageTags")
      .addEventListener("command", () =>
        commandController.doCommand("cmd_manageTags")
      );

    threadTree.addEventListener("select", () => this.update());
    window.addEventListener("folderURIChanged", () => this.update());
    this.update();
  },

  /**
   * Enable each button according to the current folder and selection.
   */
  update() {
    const hasSelection = (gDBView?.numSelected ?? 0) > 0;
    for (const button of this.ribbon.querySelectorAll("button[data-action]")) {
      const action = button.dataset.action;
      const command = this.COMMANDS[action];
      if (command) {
        button.disabled = !commandController.isCommandEnabled(command);
      } else if (this.NEEDS_SELECTION.has(action)) {
        button.disabled = !hasSelection;
      }
    }
  },

  /**
   * @param {string} action - The data-action of the clicked button.
   * @param {HTMLButtonElement} button
   * @param {MouseEvent} event
   */
  doAction(action, button, event) {
    if (this.COMMANDS[action]) {
      commandController.doCommand(this.COMMANDS[action], event);
      return;
    }
    switch (action) {
      case "new-event":
        top.goDoCommand("calendar_new_event_command");
        break;
      case "block":
        this.blockSender();
        break;
      case "sweep":
        this.sweepSender();
        break;
      case "move":
        this.movePopup.openPopup(button, "after_start", 0, 4);
        break;
      case "rules":
        this.rulesPopup.openPopup(button, "after_start", 0, 4);
        break;
      case "categorize":
        this.buildTagPopup();
        this.tagPopup.openPopup(button, "after_start", 0, 4);
        break;
      case "undo":
        top.goDoCommand("cmd_undo");
        break;
    }
  },

  /**
   * @returns {?string} The address of the first selected message's sender.
   */
  selectedSender() {
    const message = gDBView?.hdrForFirstSelectedMessage;
    if (!message) {
      return null;
    }
    return (
      MailServices.headerParser.parseDecodedHeader(message.mime2DecodedAuthor)[0]
        ?.email || null
    );
  },

  /**
   * Add a filter deleting all future mail from the selected sender, then
   * delete the selected messages.
   */
  async blockSender() {
    const email = this.selectedSender();
    if (!email) {
      return;
    }
    const [title, text] = await document.l10n.formatValues([
      { id: "mail-ribbon-block-title" },
      { id: "mail-ribbon-block-confirm", args: { email } },
    ]);
    if (!Services.prompt.confirm(window, title, text)) {
      return;
    }

    const server = gDBView.hdrForFirstSelectedMessage.folder.server;
    const filterList = server.getFilterList(top.msgWindow);
    const filter = filterList.createFilter(title + ": " + email);
    const term = filter.createTerm();
    term.attrib = Ci.nsMsgSearchAttrib.Sender;
    term.op = Ci.nsMsgSearchOp.Contains;
    term.booleanAnd = true;
    const value = term.value;
    value.attrib = term.attrib;
    value.str = email;
    term.value = value;
    filter.appendTerm(term);
    const filterAction = filter.createAction();
    filterAction.type = Ci.nsMsgFilterAction.Delete;
    filter.appendAction(filterAction);
    filter.enabled = true;
    filter.filterType = Ci.nsMsgFilterType.InboxRule | Ci.nsMsgFilterType.Manual;
    filterList.insertFilterAt(0, filter);
    filterList.saveToDefaultFile();

    commandController.doCommand("cmd_delete");
  },

  /**
   * Delete every message in this folder from the selected sender.
   */
  async sweepSender() {
    const email = this.selectedSender()?.toLowerCase();
    if (!email || !gFolder) {
      return;
    }
    const messages = [...gFolder.messages].filter(
      message =>
        MailServices.headerParser
          .parseDecodedHeader(message.mime2DecodedAuthor)[0]
          ?.email.toLowerCase() == email
    );
    const [title, text] = await document.l10n.formatValues([
      { id: "mail-ribbon-sweep-title" },
      {
        id: "mail-ribbon-sweep-confirm",
        args: { count: messages.length, email },
      },
    ]);
    if (!Services.prompt.confirm(window, title, text)) {
      return;
    }
    gFolder.deleteMessages(messages, top.msgWindow, false, false, null, true);
  },

  /**
   * Fill the Categorize menu with the tags, checking those already on the
   * first selected message.
   */
  buildTagPopup() {
    const separator = document.getElementById("mailRibbonTagSeparator");
    while (separator.nextElementSibling) {
      separator.nextElementSibling.remove();
    }
    const message = gDBView?.hdrForFirstSelectedMessage;
    const currentTags = message
      ? message.getStringProperty("keywords").split(" ")
      : [];
    for (const tagInfo of MailServices.tags.getAllTags()) {
      const hasTag = currentTags.includes(tagInfo.key);
      if (tagInfo.ordinal.includes("~AUTOTAG") && !hasTag) {
        continue;
      }
      const item = document.createXULElement("menuitem");
      item.setAttribute("type", "checkbox");
      item.setAttribute("label", tagInfo.tag);
      item.toggleAttribute("checked", hasTag);
      if (tagInfo.color) {
        item.style.setProperty("--tag-color", tagInfo.color);
      }
      item.addEventListener("command", () =>
        commandController._toggleMessageTag(
          tagInfo.key,
          item.hasAttribute("checked")
        )
      );
      this.tagPopup.appendChild(item);
    }
  },
};

window.addEventListener("load", () => mailRibbon.init(), { once: true });
