/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

import { TreeViewTableRow } from "chrome://messenger/content/tree-view.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://messenger/content/thread-card-tags.mjs";

const { MailServices } = ChromeUtils.importESModule(
  "resource:///modules/MailServices.sys.mjs"
);

const DATE_FORMAT_PREF = "wyrm.threadpane.dateFormat";
const PINNED_KEYWORD = "$pinned";

/**
 * Domains of public mail providers. Mail between two people on these is not
 * "external", since they share no organization.
 */
const PUBLIC_MAIL_DOMAINS = new Set([
  "aol.com",
  "gmail.com",
  "gmx.com",
  "googlemail.com",
  "hotmail.com",
  "icloud.com",
  "live.com",
  "me.com",
  "msn.com",
  "outlook.com",
  "proton.me",
  "protonmail.com",
  "yahoo.com",
]);

/** @type {Map<string, Set<string>>} Organization domains by server key. */
const orgDomainsByServer = new Map();

/**
 * @param {string} address
 * @returns {string}
 */
function domainOf(address) {
  return address.split("@").pop().toLowerCase();
}

/**
 * Whether a message comes from outside the organization of the account that
 * received it. Accounts on public mail providers have no organization.
 *
 * @param {nsIMsgDBHdr} message
 * @returns {boolean}
 */
function isExternal(message) {
  const server = message.folder?.server;
  if (!server) {
    return false;
  }
  let orgDomains = orgDomainsByServer.get(server.key);
  if (!orgDomains) {
    orgDomains = new Set(
      MailServices.accounts
        .getIdentitiesForServer(server)
        .map(identity => domainOf(identity.email ?? ""))
        .filter(domain => domain && !PUBLIC_MAIL_DOMAINS.has(domain))
    );
    orgDomainsByServer.set(server.key, orgDomains);
  }
  if (!orgDomains.size) {
    return false;
  }
  const sender = MailServices.headerParser.parseDecodedHeader(
    message.mime2DecodedAuthor
  )[0]?.email;
  return !!sender && !orgDomains.has(domainOf(sender));
}

let dateFormatters;

/**
 * Format a message date for the card, following the user's chosen format.
 *
 * @param {Date} date
 * @returns {string}
 */
function formatCardDate(date) {
  dateFormatters ??= {
    time: new Services.intl.DateTimeFormat(undefined, { timeStyle: "short" }),
    weekday: new Services.intl.DateTimeFormat(undefined, { weekday: "short" }),
    weekdayTime: new Services.intl.DateTimeFormat(undefined, {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
    date: new Services.intl.DateTimeFormat(undefined, { dateStyle: "short" }),
    dateTime: new Services.intl.DateTimeFormat(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    }),
  };

  switch (Services.prefs.getStringPref(DATE_FORMAT_PREF, "weekday-time")) {
    case "smart": {
      const now = new Date();
      const startOfToday = new Date(now).setHours(0, 0, 0, 0);
      if (date >= startOfToday) {
        return dateFormatters.time.format(date);
      }
      if (now - date < 6 * 24 * 60 * 60 * 1000) {
        return dateFormatters.weekday.format(date);
      }
      return dateFormatters.date.format(date);
    }
    case "date":
      return dateFormatters.date.format(date);
    case "date-time":
      return dateFormatters.dateTime.format(date);
    default:
      return dateFormatters.weekdayTime.format(date);
  }
}

Services.prefs.addObserver(DATE_FORMAT_PREF, invalidateThreadTree);
window.addEventListener(
  "unload",
  () => Services.prefs.removeObserver(DATE_FORMAT_PREF, invalidateThreadTree),
  { once: true }
);

function invalidateThreadTree() {
  window.threadTree?.invalidate();
}

/** @type {Map<nsIMsgFolder, Set<nsMsgKey>>} Previews waiting to be fetched. */
const pendingPreviews = new Map();
/** @type {Set<string>} Messages whose preview was already requested. */
const requestedPreviews = new Set();
let previewTimer = null;

const previewListener = {
  QueryInterface: ChromeUtils.generateQI(["nsIUrlListener"]),
  OnStartRunningUrl() {},
  OnStopRunningUrl() {
    invalidateThreadTree();
  },
};

/**
 * Ask the folder for a message's preview text. Requests are batched per
 * folder and each message is only asked for once.
 *
 * @param {nsIMsgDBHdr} message
 */
function requestPreview(message) {
  const id = `${message.folder.URI}#${message.messageKey}`;
  if (requestedPreviews.has(id)) {
    return;
  }
  requestedPreviews.add(id);
  if (!pendingPreviews.has(message.folder)) {
    pendingPreviews.set(message.folder, new Set());
  }
  pendingPreviews.get(message.folder).add(message.messageKey);
  previewTimer ??= setTimeout(() => {
    previewTimer = null;
    let fetchedNow = false;
    for (const [folder, keys] of pendingPreviews) {
      try {
        if (!folder.fetchMsgPreviewText([...keys], previewListener)) {
          fetchedNow = true;
        }
      } catch (e) {
        console.warn(`Could not fetch previews in ${folder.URI}`, e);
      }
    }
    pendingPreviews.clear();
    if (fetchedNow) {
      invalidateThreadTree();
    }
  }, 100);
}

/**
 * The tr element row of the TreeView table for the cards view layout.
 * NOTE: The main child is a clone of the `#threadPaneCardTemplate` template.
 *
 * @tagname thread-row
 * @augments {TreeViewTableRow}
 */
class ThreadCard extends TreeViewTableRow {
  static ROW_HEIGHT = 46;

  /** Height of the date group headings when grouped by sort. */
  static HEADER_ROW_HEIGHT = 34;

  /**
   * @param {TreeView} tree
   * @returns {boolean} Whether the list may contain group heading rows.
   */
  static hasHeaderRows(tree) {
    // nsMsgViewFlagsType.kGroupBySort
    return !!(tree.view?.viewFlags & 0x40);
  }

  /**
   * @param {nsIMsgDBView} view
   * @param {integer} index
   * @returns {boolean} Whether the row at `index` is a group heading.
   */
  static isHeaderRow(view, index) {
    // MSG_VIEW_FLAG_DUMMY
    return !!(view.getFlagsAt(index) & 0x20000000);
  }

  connectedCallback() {
    if (this.hasConnected) {
      return;
    }

    super.connectedCallback();

    this.setAttribute("draggable", "true");
    this.classList.add("card-layout");

    this.appendChild(
      document.getElementById("threadPaneCardTemplate").content.cloneNode(true)
    );

    this.cardCell = this.querySelector("td");
    this.accountIndicator = this.querySelector(".account-indicator");
    this.senderLine = this.querySelector(".sender");
    this.subjectLine = this.querySelector(".subject");
    this.dateLine = this.querySelector(".date");
    this.starButton = this.querySelector(".button-star");
    this.threadCardTags = this.querySelector("thread-card-tags");
    this.replies = this.querySelector(".thread-replies");
    this.twistyButton = this.querySelector("button.twisty");
    this.sortHeaderDetails = this.querySelector(".sort-header-details");
    this.statusIndicator = this.querySelector(".read-status");
    this.externalTag = this.querySelector(".external-tag");
    this.previewLine = this.querySelector(".thread-card-preview");
    this.pinButton = this.querySelector(".tree-button-pin");
  }

  fillRow() {
    super.fillRow();

    if (this.getAttribute("role") == "row") {
      this.cardCell.setAttribute("role", "gridcell");
    }

    // XPCOM calls here must be keep to a minimum. Collect all of the
    // required data in one go.
    const properties = {};
    const threadLevel = {};

    const cellTexts = this.view.cellDataForColumns(
      this._index,
      window.threadPane.cardColumns,
      properties,
      threadLevel
    );

    // Collect the various strings and fluent IDs to build the full string for
    // the message row aria-label.
    const ariaLabelPromises = [];
    // Use static mapping instead of threadPane.cardColumns since the name of
    // the sender column changes. (see getProperSenderForCardsView)
    const KEYS = [
      "subject",
      "sender",
      "date",
      "tagKeys",
      "total",
      "unread",
      "account",
      "serverKey",
    ];
    const data = Object.fromEntries(KEYS.map((key, i) => [key, cellTexts[i]]));

    this.accountIndicator.style.setProperty(
      "--account-color",
      `var(--server-${CSS.escape(data.serverKey)}-color)`
    );
    this.accountIndicator.title = data.account;

    if (threadLevel.value) {
      properties.value += " thread-children";
    }
    const propertiesSet = new Set(properties.value.split(" "));
    this.dataset.properties = properties.value.trim();
    this.style.height = `${
      propertiesSet.has("dummy")
        ? ThreadCard.HEADER_ROW_HEIGHT
        : ThreadCard.ROW_HEIGHT
    }px`;
    this.#updateTwistyButton();

    this.subjectLine.textContent = data.subject;
    this.subjectLine.title = data.subject;

    // Handle a different style and data if this is a dummy row.
    if (propertiesSet.has("dummy")) {
      const unread = Number(data.unread);
      const total = Number(data.total);

      if (unread) {
        document.l10n.setAttributes(
          this.sortHeaderDetails,
          "threadpane-sort-header-unread-count",
          {
            unread,
            total,
          }
        );
        return;
      }

      document.l10n.setAttributes(
        this.sortHeaderDetails,
        "threadpane-sort-header-count",
        {
          total,
        }
      );
      return;
    }

    this.senderLine.textContent = MailServices.headerParser
      .parseDecodedHeader(data.sender)
      .map(address => address.name || address.email)
      .join(", ") || data.sender;
    this.senderLine.title = data.sender;
    this.dateLine.textContent = data.date;

    let message = null;
    try {
      message = this.view.getMsgHdrAt(this._index);
    } catch (e) {
      // Not a real message, keep the column data.
    }
    if (message) {
      this.dateLine.textContent = formatCardDate(new Date(message.date / 1000));
      this.externalTag.hidden = !isExternal(message);

      const preview = message.getStringProperty("preview").replace(/\s+/g, " ").trim();
      this.previewLine.textContent = preview;
      if (!preview) {
        requestPreview(message);
      }

      const isPinned = message
        .getStringProperty("keywords")
        .split(" ")
        .includes(PINNED_KEYWORD);
      this.classList.toggle("pinned", isPinned);
      document.l10n.setAttributes(
        this.pinButton,
        isPinned ? "threadpane-card-unpin-button" : "threadpane-card-pin-button"
      );
    } else {
      this.externalTag.hidden = true;
      this.previewLine.textContent = "";
      this.classList.remove("pinned");
    }

    this.threadCardTags.setAttribute("tags", data.tagKeys);

    // Follow the layout order.
    ariaLabelPromises.push(data.sender);
    ariaLabelPromises.push(data.date);
    ariaLabelPromises.push(data.subject);
    ariaLabelPromises.push(data.tags);

    if (propertiesSet.has("flagged")) {
      document.l10n.setAttributes(
        this.starButton,
        "tree-list-view-row-flagged"
      );
      ariaLabelPromises.push(
        document.l10n.formatValue("threadpane-flagged-cell-label")
      );
    } else {
      document.l10n.setAttributes(this.starButton, "tree-list-view-row-flag");
    }

    if (propertiesSet.has("junk")) {
      ariaLabelPromises.push(
        document.l10n.formatValue("threadpane-spam-cell-label")
      );
    }

    if (propertiesSet.has("new")) {
      document.l10n.setAttributes(
        this.statusIndicator,
        "tree-list-view-row-new-status"
      );
      ariaLabelPromises.push(
        document.l10n.formatValue("threadpane-new-cell-label")
      );
    } else if (propertiesSet.has("read")) {
      ariaLabelPromises.push(
        document.l10n.formatValue("threadpane-read-cell-label")
      );
    } else if (propertiesSet.has("unread")) {
      document.l10n.setAttributes(
        this.statusIndicator,
        "tree-list-view-row-not-read-status"
      );
      ariaLabelPromises.push(
        document.l10n.formatValue("threadpane-unread-cell-label")
      );
    }

    if (propertiesSet.has("attach")) {
      ariaLabelPromises.push(
        document.l10n.formatValue("threadpane-attachments-cell-label")
      );
    }

    // Display number of replies in the twisty button.
    const repliesCount = parseInt(data.total) - 1;
    if (repliesCount > 0) {
      document.l10n.setAttributes(this.replies, "threadpane-replies", {
        count: repliesCount,
      });
    }

    Promise.allSettled(ariaLabelPromises).then(results => {
      this.setAttribute(
        "aria-label",
        results
          .map(settledPromise => settledPromise.value ?? "")
          .filter(value => value.trim() != "")
          .join(", ")
      );
    });
  }

  #updateTwistyButton() {
    if (!this.classList.contains("children")) {
      this.twistyButton.removeAttribute("data-l10n-id");
      this.twistyButton.removeAttribute("aria-expanded");
      this.twistyButton.removeAttribute("aria-label");
      return;
    }

    const isCollapsed = this.classList.contains("collapsed");
    document.l10n.setAttributes(
      this.twistyButton,
      isCollapsed
        ? "tree-list-view-row-expand-thread-button"
        : "tree-list-view-row-collapse-thread-button"
    );
    this.twistyButton.ariaExpanded = String(!isCollapsed);
  }
}
customElements.define("thread-card", ThreadCard, {
  extends: "tr",
});
