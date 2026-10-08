from gi.repository import Adw, Gio, Gtk

FOLDERS = [
    ('Inbox', 'mail-unread-symbolic'),
    ('Drafts', 'document-edit-symbolic'),
    ('Sent', 'mail-send-symbolic'),
    ('Archive', 'folder-symbolic'),
    ('Trash', 'user-trash-symbolic'),
]


@Gtk.Template(resource_path='/io/github/kkyriazakis/MailClient/window.ui')
class MailClientWindow(Adw.ApplicationWindow):
    __gtype_name__ = 'MailClientWindow'

    split_view = Gtk.Template.Child()
    folder_list = Gtk.Template.Child()
    content_page = Gtk.Template.Child()
    toast_overlay = Gtk.Template.Child()

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        self.settings = Gio.Settings.new('io.github.kkyriazakis.MailClient')
        self.settings.bind('window-width', self, 'default-width', Gio.SettingsBindFlags.DEFAULT)
        self.settings.bind('window-height', self, 'default-height', Gio.SettingsBindFlags.DEFAULT)
        self.settings.bind('window-maximized', self, 'maximized', Gio.SettingsBindFlags.DEFAULT)

        for name, icon in FOLDERS:
            self.folder_list.append(self._folder_row(name, icon))
        self.folder_list.select_row(self.folder_list.get_row_at_index(0))

        add_account = Gio.SimpleAction.new('add-account', None)
        add_account.connect('activate', self.on_add_account)
        self.add_action(add_account)

    def _folder_row(self, name, icon):
        box = Gtk.Box(spacing=12, margin_top=6, margin_bottom=6, margin_start=6, margin_end=6)
        box.append(Gtk.Image(icon_name=icon))
        box.append(Gtk.Label(label=name, xalign=0))
        row = Gtk.ListBoxRow(child=box)
        row.folder_name = name
        return row

    @Gtk.Template.Callback()
    def on_folder_activated(self, _list_box, row):
        self.content_page.set_title(row.folder_name)
        self.split_view.set_show_content(True)

    def on_add_account(self, *_args):
        self.toast_overlay.add_toast(Adw.Toast(title='Account setup is not implemented yet'))
