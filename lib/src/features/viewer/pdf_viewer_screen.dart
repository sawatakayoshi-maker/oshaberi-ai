import 'package:flutter/material.dart';
import 'package:pdfx/pdfx.dart';

import '../../data/scan_document.dart';

/// 一覧から選んだ PDF を端末内で再表示する（アプリ内ビューア）。
class PdfViewerScreen extends StatefulWidget {
  const PdfViewerScreen({super.key, required this.document});

  final ScanDocument document;

  @override
  State<PdfViewerScreen> createState() => _PdfViewerScreenState();
}

class _PdfViewerScreenState extends State<PdfViewerScreen> {
  late final PdfControllerPinch _controller;

  @override
  void initState() {
    super.initState();
    _controller = PdfControllerPinch(
      document: PdfDocument.openFile(widget.document.filePath),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // 読み込み中／エラー表示は pdfx の既定ビルダーに任せる（アプリ内で完結）。
    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.document.title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ),
      body: PdfViewPinch(controller: _controller),
    );
  }
}
