# Parity status

Latest baseline run: `2026-09-15T02-59-58-779Z-8460` (2026-09-15T02:59:58.779Z) — gate **NOT PASSED**.

Pixel rows: 0 pass, 33 fail, 155 incomplete, 0 blocked of 192. Eligibility: {"pixel":48,"token-only":24,"artifact-docs":1,"blocked":10}.

## Largest measured gaps

| Screen | Width | Diff % | Reason |
|---|---:|---:|---|
| app.admin.github | 375 | 77.6393% | 77.639% differing pixels exceeds the 0.5% ceiling |
| app.admin.export | 768 | 59.5075% | 59.507% differing pixels exceeds the 0.5% ceiling |
| app.admin.export | 375 | 52.3222% | 52.322% differing pixels exceeds the 0.5% ceiling |
| app.admin.export | 1024 | 49.7433% | 49.743% differing pixels exceeds the 0.5% ceiling |
| app.admin.enrichment | 1024 | 38.9792% | 38.979% differing pixels exceeds the 0.5% ceiling |
| app.admin.enrichment | 768 | 38.1921% | 38.192% differing pixels exceeds the 0.5% ceiling |
| app.admin.enrichment | 1440 | 37.3248% | 37.325% differing pixels exceeds the 0.5% ceiling |
| app.admin.audit | 375 | 36.9916% | 36.992% differing pixels exceeds the 0.5% ceiling |
| app.admin.export | 1440 | 35.5759% | 35.576% differing pixels exceeds the 0.5% ceiling |
| app.admin.audit | 768 | 35.2342% | 35.234% differing pixels exceeds the 0.5% ceiling |

## Blocked rows

- none

## Incomplete rows

- app.admin.github@768: infrastructure failure: page.evaluate: Target page, context or browser has been closed
Browser logs:

<launching> /home/runner/workspace/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome --disable-field-trial-config --disable-background-networking --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-back-forward-cache --disable-breakpad --disable-client-side-phishing-detection --disable-component-extensions-with-background-pages --disable-component-update --no-default-browser-check --disable-default-apps --disable-dev-shm-usage --disable-edgeupdater --disable-extensions --disable-features=AvoidUnnecessaryBeforeUnloadCheckSync,BoundaryEventDispatchTracksNodeRemoval,DestroyProfileOnBrowserClose,DialMediaRouteProvider,GlobalMediaControls,HttpsUpgrades,LensOverlay,MediaRouter,PaintHolding,ThirdPartyStoragePartitioning,Translate,AutoDeElevate,RenderDocument,OptimizationHints,msForceBrowserSignIn,msEdgeUpdateLaunchServicesPreferredVersion --enable-features=CDPScreenshotNewSurface --allow-pre-commit-input --disable-hang-monitor --disable-ipc-flooding-protection --disable-popup-blocking --disable-prompt-on-repost --disable-renderer-backgrounding --force-color-profile=srgb --metrics-recording-only --no-first-run --password-store=basic --use-mock-keychain --no-service-autorun --export-tagged-pdf --disable-search-engine-choice-screen --unsafely-disable-devtools-self-xss-warnings --edge-skip-compat-layer-relaunch --disable-infobars --disable-search-engine-choice-screen --disable-sync --enable-unsafe-swiftshader --headless --hide-scrollbars --mute-audio --blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4 --no-sandbox --disable-partial-raster --user-data-dir=/tmp/playwright_chromiumdev_profile-bZSY85 --remote-debugging-pipe --no-startup-window
<launched> pid=8471
[pid=8471][err] [8471:8487:0915/025959.083082:ERROR:dbus/bus.cc:405] Failed to connect to the bus: Failed to connect to socket /run/dbus/system_bus_socket: No such file or directory
[pid=8471][err] [8471:8487:0915/025959.090543:ERROR:dbus/bus.cc:405] Failed to connect to the bus: Could not parse server address: Unknown address type (examples of valid types are "tcp" and on UNIX "unix")
[pid=8471][err] [8471:8487:0915/025959.090792:ERROR:dbus/bus.cc:405] Failed to connect to the bus: Failed to connect to socket /run/dbus/system_bus_socket: No such file or directory
[pid=8471][err] [8471:8487:0915/025959.090820:ERROR:dbus/bus.cc:405] Failed to connect to the bus: Failed to connect to socket /run/dbus/system_bus_socket: No such file or directory
[pid=8471][err] [8471:8487:0915/025959.139209:ERROR:dbus/bus.cc:405] Failed to connect to the bus: Could not parse server address: Unknown address type (examples of valid types are "tcp" and on UNIX "unix")
[pid=8471][err] [8471:8487:0915/025959.163260:ERROR:dbus/bus.cc:405] Failed to connect to the bus: Could not parse server address: Unknown address type (examples of valid types are "tcp" and on UNIX "unix")
[pid=8471][err] [8471:8471:0915/025959.167347:ERROR:dbus/object_proxy.cc:572] Failed to call method: org.freedesktop.DBus.NameHasOwner: object_path= /org/freedesktop/DBus: unknown error type: 
[pid=8471][err] [8471:8487:0915/025959.167795:ERROR:dbus/bus.cc:405] Failed to connect to the bus: Could not parse server address: Unknown address type (examples of valid types are "tcp" and on UNIX "unix")
[pid=8471][err] [8471:8471:0915/025959.176601:ERROR:dbus/object_proxy.cc:572] Failed to call method: org.freedesktop.DBus.NameHasOwner: object_path= /org/freedesktop/DBus: unknown error type: 
[pid=8471][err] [8471:8471:0915/025959.177482:ERROR:dbus/object_proxy.cc:572] Failed to call method: org.freedesktop.DBus.NameHasOwner: object_path= /org/freedesktop/DBus: unknown error type: 
[pid=8471][err] [8471:8487:0915/025959.177559:ERROR:dbus/bus.cc:405] Failed to connect to the bus: Could not parse server address: Unknown address type (examples of valid types are "tcp" and on UNIX "unix")
[pid=8471][err] [8471:8471:0915/025959.178130:ERROR:dbus/object_proxy.cc:572] Failed to call method: org.freedesktop.DBus.NameHasOwner: object_path= /org/freedesktop/DBus: unknown error type: 
[pid=8471][err] [8471:8487:0915/025959.178330:ERROR:dbus/bus.cc:405] Failed to connect to the bus: Failed to connect to socket /run/dbus/system_bus_socket: No such file or directory
[pid=8471][err] [8471:8487:0915/025959.178355:ERROR:dbus/bus.cc:405] Failed to connect to the bus: Failed to connect to socket /run/dbus/system_bus_socket: No such file or directory
[pid=8471][err] [8471:8471:0915/025959.180569:ERROR:dbus/object_proxy.cc:572] Failed to call method: org.freedesktop.DBus.NameHasOwner: object_path= /org/freedesktop/DBus: unknown error type: 
[pid=8471][err] [8471:8487:0915/025959.180643:ERROR:dbus/bus.cc:405] Failed to connect to the bus: Could not parse server address: Unknown address type (examples of valid types are "tcp" and on UNIX "unix")
[pid=8471][err] [8471:8471:0915/025959.180748:ERROR:dbus/object_proxy.cc:572] Failed to call method: org.freedesktop.DBus.Properties.GetAll: object_path= /org/freedesktop/UPower/devices/DisplayDevice: unknown error type: 
[pid=8471][err] [8471:8471:0915/025959.181026:ERROR:dbus/object_proxy.cc:572] Failed to call method: org.freedesktop.DBus.NameHasOwner: object_path= /org/freedesktop/DBus: unknown error type: 
[pid=8471][err] [8471:8487:0915/025959.181083:ERROR:dbus/bus.cc:405] Failed to connect to the bus: Could not parse server address: Unknown address type (examples of valid types are "tcp" and on UNIX "unix")
[pid=8471][err] [8471:8471:0915/025959.181482:ERROR:dbus/object_proxy.cc:572] Failed to call method: org.freedesktop.DBus.NameHasOwner: object_path= /org/freedesktop/DBus: unknown error type: 
[pid=8471][err] [8471:8487:0915/025959.181522:ERROR:dbus/bus.cc:405] Failed to connect to the bus: Could not parse server address: Unknown address type (examples of valid types are "tcp" and on UNIX "unix")
[pid=8471][err] [8471:8471:0915/025959.181567:ERROR:dbus/object_proxy.cc:572] Failed to call method: org.freedesktop.DBus.NameHasOwner: object_path= /org/freedesktop/DBus: unknown error type: 
[pid=8471][err] 
[pid=8471][err] (process:8471): GLib-GIO-CRITICAL **: 02:59:59.568: g_settings_schema_source_lookup: assertion 'source != NULL' failed
[pid=8471][err] [8471:8488:0915/030007.871905:ERROR:google_apis/gcm/engine/registration_request.cc:291] Registration response error message: PHONE_REGISTRATION_ERROR
[pid=8471][err] [8471:8488:0915/030007.878136:ERROR:google_apis/gcm/engine/registration_request.cc:291] Registration response error message: PHONE_REGISTRATION_ERROR
[pid=8471][err] [8471:8488:0915/030037.865168:ERROR:google_apis/gcm/engine/registration_request.cc:291] Registration response error message: DEPRECATED_ENDPOINT
[pid=8471][err] [8471:8488:0915/030120.311466:ERROR:google_apis/gcm/engine/registration_request.cc:291] Registration response error message: DEPRECATED_ENDPOINT
[pid=8471][err] [8471:8471:0915/030201.950283:ERROR:chrome/browser/ui/views/user_education/impl/browser_user_education_interface_impl.cc:181] Attempting to show IPH IPH_ExtensionsZeroStatePromo before browser initialization complete; IPH will not be shown.
[pid=8471][err] [8471:8488:0915/030255.948281:ERROR:google_apis/gcm/engine/registration_request.cc:291] Registration response error message: DEPRECATED_ENDPOINT
[pid=8471][err] [8471:8488:0915/030553.584786:ERROR:google_apis/gcm/engine/registration_request.cc:291] Registration response error message: DEPRECATED_ENDPOINT
[pid=8471][err] [8471:8471:0915/030603.399844:ERROR:chrome/browser/ui/views/user_education/impl/browser_user_education_interface_impl.cc:181] Attempting to show IPH IPH_ExtensionsZeroStatePromo before browser initialization complete; IPH will not be shown.
[pid=8471][err] [8471:8471:0915/030808.591482:ERROR:chrome/browser/ui/views/user_education/impl/browser_user_education_interface_impl.cc:181] Attempting to show IPH IPH_ExtensionsZeroStatePromo before browser initialization complete; IPH will not be shown.
- app.admin.github@1024: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.admin.github@1440: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.admin.linkhealth@375: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.admin.linkhealth@768: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.admin.linkhealth@1024: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.admin.linkhealth@1440: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.admin.overview@375: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.admin.overview@768: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.admin.overview@1024: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.admin.overview@1440: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.admin.research@375: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.admin.research@768: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.admin.research@1024: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.admin.research@1440: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.admin.researcher@375: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.admin.researcher@768: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.admin.researcher@1024: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.admin.researcher@1440: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.admin.resources@375: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.admin.resources@768: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.admin.resources@1024: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.admin.resources@1440: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.admin.subcategories@375: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.admin.subcategories@768: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.admin.subcategories@1024: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.admin.subcategories@1440: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.admin.users@375: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.admin.users@768: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.admin.users@1024: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.admin.users@1440: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.category@375: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.category@768: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.category@1024: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.category@1440: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.home.curated@375: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.home.curated@768: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.home.curated@1024: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.home.curated@1440: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.home.index@375: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.home.index@768: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.home.index@1024: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.home.index@1440: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.resource.detail@375: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.resource.detail@768: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.resource.detail@1024: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.resource.detail@1440: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.shell.mobile-drawer@375: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.shell.mobile-drawer@768: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.shell.mobile-drawer@1024: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.shell.mobile-drawer@1440: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.shell.palette@375: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.shell.palette@768: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.shell.palette@1024: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.shell.palette@1440: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.subcategory@375: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.subcategory@768: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.subcategory@1024: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.subcategory@1440: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.submit@375: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.submit@768: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.submit@1024: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.submit@1440: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.subsubcategory@375: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.subsubcategory@768: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.subsubcategory@1024: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- app.subsubcategory@1440: infrastructure failure: page.evaluate: Target page, context or browser has been closed
- artifact.docs.a11y@375: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.a11y@768: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.a11y@1024: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.a11y@1440: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.buttons@375: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.buttons@768: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.buttons@1024: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.buttons@1440: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.cards@375: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.cards@768: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.cards@1024: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.cards@1440: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.checklist@375: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.checklist@768: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.checklist@1024: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.checklist@1440: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.color@375: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.color@768: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.color@1024: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.color@1440: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.data-density@375: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.data-density@768: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.data-density@1024: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.data-density@1440: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.flows@375: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.flows@768: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.flows@1024: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.flows@1440: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.forms@375: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.forms@768: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.forms@1024: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.forms@1440: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.getting-started@375: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.getting-started@768: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.getting-started@1024: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.getting-started@1440: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.integration@375: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.integration@768: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.integration@1024: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.integration@1440: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.lists@375: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.lists@768: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.lists@1024: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.lists@1440: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.motion@375: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.motion@768: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.motion@1024: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.motion@1440: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.navigation@375: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.navigation@768: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.navigation@1024: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.navigation@1440: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.overview@375: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.overview@768: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.overview@1024: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.overview@1440: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.pages@375: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.pages@768: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.pages@1024: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.pages@1440: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.principles@375: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.principles@768: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.principles@1024: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.principles@1440: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.spacing@375: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.spacing@768: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.spacing@1024: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.spacing@1440: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.theming@375: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.theming@768: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.theming@1024: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.theming@1440: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.theming-app@375: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.theming-app@768: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.theming-app@1024: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.theming-app@1440: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.tokens@375: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.tokens@768: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.tokens@1024: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.tokens@1440: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.typography@375: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.typography@768: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.typography@1024: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.docs.typography@1440: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.showcase@375: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.showcase@768: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.showcase@1024: infrastructure failure: browser.newContext: Target page, context or browser has been closed
- artifact.showcase@1440: infrastructure failure: browser.newContext: Target page, context or browser has been closed

See [REPORT.md](REPORT.md) for every row and the evidence links.
