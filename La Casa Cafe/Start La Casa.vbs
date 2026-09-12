Set fso = CreateObject("Scripting.FileSystemObject")
scriptPath = fso.GetParentFolderName(WScript.ScriptFullName)
batPath = fso.BuildPath(scriptPath, "Start La Casa.bat")

Set WshShell = CreateObject("WScript.Shell")
WshShell.Run """" & batPath & """", 0, False