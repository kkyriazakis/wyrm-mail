/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const hideTimers = new WeakMap();

export const ToggleAnimation = {
  /**
   * Show or hide an element through its hidden attribute. Showing is animated
   * by the stylesheet. Hiding first fades the element out, because display
   * itself can not be transitioned.
   *
   * @param {Element} element
   * @param {boolean} hidden
   */
  setHidden(element, hidden) {
    const win = element.ownerDocument.defaultView;
    if (hidden && element.classList.contains("toggle-hiding")) {
      return;
    }
    win.clearTimeout(hideTimers.get(element));
    hideTimers.delete(element);

    if (!hidden) {
      element.classList.remove("toggle-hiding");
      element.hidden = false;
      return;
    }

    const value = win
      .getComputedStyle(element)
      .getPropertyValue("--toggle-duration")
      .trim();
    const duration = parseFloat(value) * (value.endsWith("ms") ? 1 : 1000);
    if (element.hidden || !element.isConnected || !duration) {
      element.classList.remove("toggle-hiding");
      element.hidden = true;
      return;
    }

    element.classList.add("toggle-hiding");
    hideTimers.set(
      element,
      win.setTimeout(() => {
        element.hidden = true;
        element.classList.remove("toggle-hiding");
      }, duration)
    );
  },
};
