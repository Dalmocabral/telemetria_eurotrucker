; Script do Inno Setup para criar o Instalador do ETS2 Telemetria
; Baixe o Inno Setup gratuitamente em: https://jrsoftware.org/isdl.php

#define MyAppName "TruckPilot Pro"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "TruckPilot Pro"
#define MyAppExeName "TruckPilot_Pro.exe"

[Setup]
AppId={{9F3B4A21-7890-4DEF-B123-TRUCKPILOTPRO}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DisableProgramGroupPage=yes
OutputDir=dist_installer
OutputBaseFilename=Instalador_TruckPilot_Pro_Setup
SetupIconFile=server\assets\icon.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "dist\TruckPilot_Pro\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "dist\TruckPilot_Pro\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
