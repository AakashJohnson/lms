Option Explicit

Dim objWord, objDoc, pageCount, arg1

' Check if an argument is provided
If WScript.Arguments.Count < 1 Then
    WScript.Echo "Error: File path not provided."
    WScript.Quit
End If

' Get the file path from the command-line argument
arg1 = WScript.Arguments(0)

' Initialize Word application
Set objWord = CreateObject("Word.Application")
objWord.Visible = False ' Set to True if you want to see the Word application window

' Open the DOCX file
Set objDoc = objWord.Documents.Open(arg1)

' Get the number of pages
pageCount = objDoc.ComputeStatistics(2) ' 2 represents wdStatisticPages constant for page count

' Close the document
objDoc.Close

' Quit Word application
objWord.Quit

' Release the objects
Set objDoc = Nothing
Set objWord = Nothing

' Return the page count
WScript.Quit pageCount



