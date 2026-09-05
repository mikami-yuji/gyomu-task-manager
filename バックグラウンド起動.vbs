' 業務課依頼管理ツール バックグラウンド常駐ランチャー
' 黒いコマンドプロンプト画面を表示させずにサーバーを起動します
Set ws = CreateObject("Wscript.Shell")
currentDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
ws.CurrentDirectory = currentDir
ws.Run "cmd /c """ & currentDir & "スタート_業務課ツール.bat""", 0, False
