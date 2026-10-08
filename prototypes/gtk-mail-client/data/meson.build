desktop_file = files(app_id + '.desktop')
metainfo_file = files(app_id + '.metainfo.xml')

install_data(desktop_file, install_dir: get_option('datadir') / 'applications')
install_data(metainfo_file, install_dir: get_option('datadir') / 'metainfo')
install_data(app_id + '.gschema.xml', install_dir: get_option('datadir') / 'glib-2.0' / 'schemas')
install_data('icons/hicolor/scalable/apps' / app_id + '.svg',
  install_dir: get_option('datadir') / 'icons' / 'hicolor' / 'scalable' / 'apps')

desktop_file_validate = find_program('desktop-file-validate', required: false)
if desktop_file_validate.found()
  test('Validate desktop file', desktop_file_validate, args: [desktop_file])
endif

appstreamcli = find_program('appstreamcli', required: false)
if appstreamcli.found()
  test('Validate metainfo file', appstreamcli,
    args: ['validate', '--no-net', '--explain', metainfo_file])
endif

compile_schemas = find_program('glib-compile-schemas', required: false)
if compile_schemas.found()
  test('Validate schema file', compile_schemas,
    args: ['--strict', '--dry-run', meson.current_source_dir()])
endif
