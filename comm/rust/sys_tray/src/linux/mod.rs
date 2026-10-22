/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use fluent_ffi::{FluentBundleRc, adapt_bundle_for_gecko};
use ksni::Handle;
use nserror::{NS_OK, nsresult};
use nsstring::nsCString;
use std::ffi::CStr;
use std::os::raw::c_void;
use std::rc::Rc;
use std::thread;
use system_tray::{SystemTray, TrayItem, XdgIcon};
use xpcom::interfaces::nsIPrefBranch;
use xpcom::{RefPtr, get_service, nsIID, xpcom_method};

use crate::{Action, locales};

unsafe extern "C" {
    pub fn nsGNOMEShellService_GetGSettingsBoolean(
        schema: &nsCString,
        key: &nsCString,
        default: bool,
    ) -> bool;
}

pub mod system_tray;

/// Retrieves the boolean value associated with the given
/// pref.
fn get_bool_pref(name: &CStr) -> Option<bool> {
    let mut value = false;
    let prefs_service = get_service::<nsIPrefBranch>(c"@mozilla.org/preferences-service;1")?;
    unsafe {
        prefs_service
            .GetBoolPref(name.as_ptr(), &mut value)
            .to_result()
            .ok()?;
    }
    Some(value)
}

/// Construct a new xpcom object for tray handling on Linux
///
/// Note eventually this will move back into the main crate
/// when we can handle all tray types.
///
/// # Safety
///
/// Reliant on the xpcom system, exports as a C function
#[unsafe(no_mangle)]
pub unsafe extern "C" fn nsLinuxSysTrayHandlerConstructor(
    iid: &nsIID,
    result: *mut *mut c_void,
) -> nsresult {
    let instance = LinuxSysTrayHandler::new();
    unsafe { instance.QueryInterface(iid, result) }
}

/// System tray implementation for Linux
#[xpcom::xpcom(implement(nsIMessengerOSIntegration), atomic)]
pub struct LinuxSysTrayHandler {
    handle: Handle<SystemTray>,
}

/// The tray icon is shown while the app keeps running in the background when
/// closed, or when it is asked to always show.
fn tray_enabled() -> bool {
    get_bool_pref(c"mail.closeToTray").unwrap_or(false)
        || get_bool_pref(c"mail.biff.show_tray_icon_always").unwrap_or(false)
}

/// Format a message without arguments from the bundle.
fn format_message(bundle: &FluentBundleRc, id: &str) -> String {
    let Some(pattern) = bundle.get_message(id).and_then(|m| m.value()) else {
        log::error!("missing message: {id}");
        return String::new();
    };
    let mut errors = vec![];
    let value = bundle.format_pattern(pattern, None, &mut errors);
    if !errors.is_empty() {
        log::error!("translation issues: {errors:?}");
    }
    value.into()
}

impl LinuxSysTrayHandler {
    /// Construct a new system tray
    pub fn new() -> RefPtr<LinuxSysTrayHandler> {
        let locs = locales::app_locales().expect("Failed to retrieve application locales");
        let resource = locales::fl_resource().expect("Failed to parse fluent templates");
        let mut bundle = FluentBundleRc::new(locs);
        adapt_bundle_for_gecko(&mut bundle, None);

        bundle
            .add_resource(Rc::new(resource))
            .expect("Failed to add resources to bundle");

        let quit_msg = format_message(&bundle, "system-tray-menuitem-quit");
        let open_msg = format_message(&bundle, "system-tray-menuitem-open");
        let title = format_message(&bundle, "system-tray-title");

        // Determine correct image
        let icon = if XdgIcon::requires_symbolic() {
            system_tray::locate_icon_on_system("TB-symbolic.svg").map(XdgIcon::Path)
        } else {
            system_tray::locate_icon_on_system("default256.png").map(XdgIcon::Path)
        }
        .ok()
        .unwrap_or_else(|| XdgIcon::for_desktop("wyrm-mail"));

        // Build our menu structure
        let menus = [
            TrayItem::ActionItem {
                label: open_msg,
                icon: None,
                action: Action::ShowWindow,
                enabled: true,
                visible: true,
            },
            TrayItem::Separator,
            TrayItem::ActionItem {
                label: quit_msg,
                icon: None,
                action: Action::Quit,
                enabled: true,
                visible: true,
            },
        ];

        // The service always runs so the icon can be shown or hidden later
        // without a restart; a hidden icon is a passive item.
        let mut tray = SystemTray::new("wyrm-mail", icon, title).with_items(menus);
        tray.visible = tray_enabled();
        let service = ksni::TrayService::new(tray);
        let handle = service.handle();
        thread::spawn(|| match service.run_without_dbus_name() {
            Ok(_) => (),
            Err(e) => log::error!("Spawning system tray FAILED: {e}"),
        });
        LinuxSysTrayHandler::allocate(InitLinuxSysTrayHandler { handle })
    }

    // Show the unread count in the tooltip, and pick up a change to whether
    // the icon should be shown.
    xpcom_method!(update_unread_count => UpdateUnreadCount(unreadCount: u32, unreadToolTip: *const nsstring::nsAString));
    fn update_unread_count(
        &self,
        _count: u32,
        tooltip: &nsstring::nsAString,
    ) -> Result<(), nsresult> {
        let tooltip = tooltip.to_string();
        let visible = tray_enabled();
        self.handle.update(|tray| {
            tray.tooltip = tooltip;
            tray.visible = visible;
        });
        Ok(())
    }

    // Handle any cleanups
    xpcom_method!(on_exit => OnExit());
    fn on_exit(&self) -> Result<(), nsresult> {
        self.handle.shutdown();
        Ok(())
    }

    // Check whether Do Not Disturb is currently enabled.
    //
    // This is done by reading GSettings and checking if either
    // `org.freedesktop.Notifications.Inhibited` is true, or if
    // `org.gnome.desktop.notifications.show-banners` is false.
    xpcom_method!(get_is_in_do_not_disturb_mode => GetIsInDoNotDisturbMode() -> bool);
    fn get_is_in_do_not_disturb_mode(&self) -> Result<bool, nsresult> {
        let value;
        unsafe {
            value = nsGNOMEShellService_GetGSettingsBoolean(
                &nsCString::from("org.freedesktop.Notifications"),
                &nsCString::from("Inhibited"),
                false,
            );
        }
        if value {
            return Ok(true);
        }

        let value;
        unsafe {
            value = nsGNOMEShellService_GetGSettingsBoolean(
                &nsCString::from("org.gnome.desktop.notifications"),
                &nsCString::from("show-banners"),
                true,
            );
        }
        if !value {
            return Ok(true);
        }

        Ok(false)
    }
}
