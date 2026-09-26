; Script do Inno Setup para criar o Instalador do ETS2 Telemetria
; Baixe o Inno Setup gratuitamente em: https://jrsoftware.org/isdl.php

#define MyAppName "ETS2 Telemetria Pro"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Comunidade ETS2"
#define MyAppExeName "ETS2_Telemetria_Pro.exe"

[Setup]
AppId={{9F3B4A21-7890-4DEF-B123-ETS2TELEMETRIA}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DisableProgramGroupPage=yes
OutputDir=dist_installer
OutputBaseFilename=Instalador_ETS2_Telemetria_Setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "dist\ETS2_Telemetria_Pro\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "dist\ETS2_Telemetria_Pro\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
