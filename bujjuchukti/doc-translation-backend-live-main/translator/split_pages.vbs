Const PrevPage = 0
Const NextPage = 1

Class msoWord_SplitPages
    Private m_nFromPage
    Private m_nToPage
    Private m_nTotalPages
    Private m_nPageWidth
    Private m_wdApp
    Private m_strFileName
    Private m_strDestFilePath
    Private m_nPageSkipWidth

    Private Sub Class_Initialize()
        Set m_wdApp = CreateObject("Word.Application")
        m_wdApp.Visible = False
        m_nPageSkipWidth = 0
        m_nPageWidth = 1
        m_nFromPage = 1
        m_nToPage = 0
    End Sub

    Private Sub Class_Terminate()
        m_wdApp.Visible = True
        m_wdApp.Quit
        Set m_wdApp = Nothing
    End Sub

    Private Function getTotalPages(filename)
        Const wdNumberOfPagesInDocument = 4
        Dim doc
        Set doc = m_wdApp.Documents.Open(filename)
        getTotalPages = m_wdApp.Selection.Information(wdNumberOfPagesInDocument)
        doc.Close
        Set doc = Nothing
    End Function

    Private Function isPagesValid()
        isPagesValid = CBool(m_nFromPage <= m_nToPage And m_nFromPage > 0 And m_nToPage <= m_nTotalPages)
    End Function

    ' keepPage Need keep pages
    ' t        delete type PrevPage or Next Page
    Private Sub deletePages(keepPage, t)
        Const wdGoToPage = 1
        Const wdGoToNext = 2
        Const wdStory = 6

        Dim Range, Selection
        Dim Range1, Range2

        If Not isPagesValid() Then Exit Sub
        If t = PrevPage And keepPage < 1 Then Exit Sub
        If t = NextPage And keepPage > m_nTotalPages Then Exit Sub

        Set Selection = m_wdApp.Selection
        Set Range = m_wdApp.Selection.Range

        Selection.GoTo wdGoToPage, wdGoToNext, keepPage
        Selection.Select

        Set Range1 = Selection.Range
        If t = PrevPage Then
            Selection.HomeKey wdStory
        Else
            Selection.EndKey wdStory
        End If
        Selection.Select
        Set Range2 = Selection.Range
        If t = PrevPage Then
            Range.Start = Range2.Start
            Range.End = Range1.End
        Else
            Range.Start = Range1.Start
            Range.End = Range2.End
        End If
        Range.Select
        Selection.Delete
        Selection.TypeBackspace
        Set Range2 = Nothing
        Set Range1 = Nothing
        Set Range = Nothing
        Set Selection = Nothing
    End Sub

    Private Function min_(a, b)
        If a > b Then
            min_ = b
        Else
            min_ = a
        End If
    End Function

    ' The number of starting pages on the installation page (first start 1)
    Public Sub setFromPage(p)
        m_nFromPage = p
    End Sub

    ' Number of pages at the end of the installation page (number of pages at the beginning)
    Public Sub setToPage(p)
        m_nToPage = p
    End Sub

    ' Number of pages pending demand for each branch office installed
    Public Sub setPageWidth(p)
        m_nPageWidth = p
    End Sub

    ' Number of pages to jump through the installation process
    Public Sub setPageSkipWidth(p)
        m_nPageSkipWidth = p
    End Sub

    ' Source word document path
    Public Sub setFileName(fn)
        m_strFileName = fn
    End Sub

    ' Multiple Word documents after installation
    Public Sub setDestFilePath(fn)
        m_strDestFilePath = fn
    End Sub

    ' line function
    Public Function execute()
        execute = False

        m_nTotalPages = getTotalPages(m_strFileName)
        If m_nToPage < 1 Then m_nToPage = m_nTotalPages
        If Not isPagesValid() Then Exit Function

        Dim i, fso, doc
        Set fso = CreateObject("Scripting.FileSystemObject")
        Dim counter: counter = 0

        If m_strFileName = "" Or (Not fso.FileExists(m_strFileName)) Then
            Exit Function
        End If

        If m_strDestFilePath = "" Or (Not fso.FolderExists(m_strDestFilePath)) Then
            m_strDestFilePath = fso.GetParentFolderName(m_strFileName)
        End If
        
        Dim strTempFileName
        For i = m_nFromPage To min_(m_nToPage, m_nTotalPages) Step (m_nPageWidth + 1)
            ' We will provide you with a copy of the letter box.
            strTempFileName = m_strDestFilePath & "\~$tmp" & i & fso.GetTempName
            fso.CopyFile m_strFileName, strTempFileName
            Set doc = m_wdApp.Documents.Open(strTempFileName)
            If i > 1 Then
                deletePages (i - 1), PrevPage
            End If
            If (i + m_nPageWidth - 1) < m_nTotalPages Then
                deletePages m_nPageWidth, NextPage
            End If
            doc.Save
            doc.Close
            Set doc = Nothing


            Dim partsFolderPath: partsFolderPath = m_strDestFilePath & "\part_" & counter
            If Not fso.FolderExists(partsFolderPath) Then
                fso.CreateFolder(partsFolderPath)
            End If

            ' Specified documents for later processing completed at the time of writing
            fso.MoveFile strTempFileName, partsFolderPath & "\part_" & counter & ".docx"
            counter = counter + 1
        Next

        Set fso = Nothing
        execute = True
    End Function
End Class

' Example:
'
Dim arg1, arg2, arg3, arg4
arg1 = WScript.Arguments(0) ' First parameter
arg2 = WScript.Arguments(1) ' Second parameter
arg3 = WScript.Arguments(2) ' Third parameter
arg4 = WScript.Arguments(3) ' Fourth parameter

Dim obj
Set obj = New msoWord_SplitPages
obj.setPageWidth CInt(arg1)
obj.setPageSkipWidth CInt(arg2)
obj.setFileName arg3
' obj.setFromPage 1
' obj.setToPage 40
obj.setDestFilePath arg4
obj.execute
Set obj = Nothing




