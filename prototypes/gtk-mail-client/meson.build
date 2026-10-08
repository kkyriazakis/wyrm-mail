project('mail-client',
          version: '0.1.0',
    meson_version: '>= 1.0.0',
  default_options: ['warning_level=2'],
)

app_id = 'io.github.kkyriazakis.MailClient'

gnome = import('gnome')
python = import('python')

# The system Python, which ships PyGObject (python3-gobject) on Fedora.
py = python.find_installation('python3', modules: ['gi'])

pkgdatadir = get_option('prefix') / get_option('datadir') / meson.project_name()

subdir('data')
subdir('src')

gnome.post_install(
     glib_compile_schemas: true,
    gtk_update_icon_cache: true,
  update_desktop_database: true,
)
