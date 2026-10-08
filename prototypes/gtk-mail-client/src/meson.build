moduledir = pkgdatadir / 'mail_client'

gnome.compile_resources('mail-client',
  'mail-client.gresource.xml',
  gresource_bundle: true,
  install: true,
  install_dir: pkgdatadir,
)

conf = configuration_data()
conf.set('PYTHON', py.full_path())
conf.set('VERSION', meson.project_version())
conf.set('pkgdatadir', pkgdatadir)

configure_file(
  input: 'mail-client.in',
  output: 'mail-client',
  configuration: conf,
  install: true,
  install_dir: get_option('bindir'),
  install_mode: 'rwxr-xr-x',
)

install_data(['__init__.py', 'main.py', 'window.py'], install_dir: moduledir)
