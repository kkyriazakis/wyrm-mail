/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs";

// nsIBaseWindow.visibility always reads as true, so remember what we hid.
const hiddenWindows = new WeakSet();

/**
 * Keeps the app running with its main window hidden, so mail keeps being
 * checked and notified while the tray icon shows the app is open.
 */
export const BackgroundWindows = {
  /**
   * Whether closing the last main window hides it instead.
   *
   * @type {boolean}
   */
  get enabled() {
    return Services.prefs.getBoolPref("mail.closeToTray", false);
  },

  /**
   * Hide a window without closing it.
   *
   * @param {Window} win
   */
  hideWindow(win) {
    const baseWindow = win.docShell.treeOwner.QueryInterface(Ci.nsIBaseWindow);
    if (AppConstants.platform == "win") {
      Cc["@mozilla.org/messenger/osintegration;1"]
        .getService(Ci.nsIMessengerWindowsIntegration)
        .hideWindow(baseWindow);
      return;
    }
    baseWindow.visibility = false;
    hiddenWindows.add(win);
  },

  /**
   * Show the hidden main windows and focus the most recent one, or open a
   * new main window if there is none.
   *
   * @returns {Window}
   */
  showMainWindow() {
    for (const win of Services.wm.getEnumerator("mail:3pane")) {
      if (hiddenWindows.has(win)) {
        hiddenWindows.delete(win);
        win.docShell.treeOwner.QueryInterface(Ci.nsIBaseWindow).visibility =
          true;
      }
    }

    const win = Services.wm.getMostRecentWindow("mail:3pane");
    if (win) {
      if (win.windowState == win.STATE_MINIMIZED) {
        win.restore();
      }
      win.focus();
      return win;
    }

    return Services.ww.openWindow(
      null,
      "chrome://messenger/content/messenger.xhtml",
      "_blank",
      "chrome,extrachrome,menubar,resizable,scrollbars,status,toolbar,dialog=no",
      null
    );
  },
};
