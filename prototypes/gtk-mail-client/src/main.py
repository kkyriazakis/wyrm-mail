import sys

import gi

gi.require_version('Gtk', '4.0')
gi.require_version('Adw', '1')

from gi.repository import Adw, Gio

from .window import MailClientWindow

APP_ID = 'io.github.kkyriazakis.MailClient'


class MailClientApplication(Adw.Application):
    def __init__(self, version):
        super().__init__(
            application_id=APP_ID,
            flags=Gio.ApplicationFlags.DEFAULT_FLAGS,
            resource_base_path='/io/github/kkyriazakis/MailClient',
        )
        self.version = version
        self.create_action('quit', lambda *_: self.quit(), ['<primary>q'])
        self.create_action('about', self.on_about_action)

    def do_activate(self):
        win = self.props.active_window
        if not win:
            win = MailClientWindow(application=self)
        win.present()

    def on_about_action(self, *_args):
        about = Adw.AboutDialog(
            application_name='Mail Client',
            application_icon=APP_ID,
            developer_name='kkyriazakis',
            version=self.version,
            license_type='gpl-3-0',
        )
        about.present(self.props.active_window)

    def create_action(self, name, callback, shortcuts=None):
        action = Gio.SimpleAction.new(name, None)
        action.connect('activate', callback)
        self.add_action(action)
        if shortcuts:
            self.set_accels_for_action(f'app.{name}', shortcuts)


def main(version):
    app = MailClientApplication(version)
    return app.run(sys.argv)
