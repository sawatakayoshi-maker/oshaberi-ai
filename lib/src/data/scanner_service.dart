import 'dart:io';

import 'package:flutter_doc_scanner/flutter_doc_scanner.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

class ScanResult {
  const ScanResult({required this.filePath, required this.pageCount});

  final String filePath;
  final int pageCount;
}

/// 端末ネイティブのドキュメントスキャナ（Android: ML Kit Document Scanner /
/// iOS: VisionKit）を起動し、四隅検出・台形補正・PDF 化までを委譲する。
///
/// 生成された PDF は一時領域に置かれるため、アプリのドキュメントディレクトリへ
/// コピーして永続化する。四隅検出・補正・PDF 化はすべてプラットフォーム側の
/// 機能を利用しており、OpenCV 自作や TFLite モデルは使用しない。
class ScannerService {
  /// 連続スキャンの最大ページ数。受け入れ基準（A4 を 5 ページ連続）を余裕を
  /// もって満たす値にしている。
  static const int maxPages = 24;

  /// スキャナを起動して 1 本の PDF を保存する。
  /// ユーザーがキャンセルした場合は null を返す。
  Future<ScanResult?> scanToPdf() async {
    final dynamic raw =
        await FlutterDocScanner().getScannedDocumentAsPdf(page: maxPages);
    if (raw == null) return null;

    final parsed = _parse(raw);
    if (parsed == null) return null;

    final savedPath = await _persist(parsed.path);
    return ScanResult(filePath: savedPath, pageCount: parsed.pageCount);
  }

  ({String path, int pageCount})? _parse(dynamic raw) {
    String? uri;
    int pageCount = 1;

    if (raw is Map) {
      uri = (raw['pdfUri'] ?? raw['Uri'] ?? raw['uri'])?.toString();
      final dynamic count = raw['pageCount'] ?? raw['Count'] ?? raw['count'];
      if (count is int) {
        pageCount = count;
      } else if (count != null) {
        pageCount = int.tryParse(count.toString()) ?? 1;
      }
    } else if (raw is String) {
      uri = raw;
    }

    if (uri == null || uri.isEmpty) return null;
    return (path: _toFilePath(uri), pageCount: pageCount);
  }

  String _toFilePath(String uri) {
    var path = uri.trim();
    if (path.startsWith('file://')) {
      path = path.replaceFirst('file://', '');
    }
    return path;
  }

  Future<String> _persist(String tempPath) async {
    final docsDir = await getApplicationDocumentsDirectory();
    final scansDir = Directory(p.join(docsDir.path, 'scans'));
    if (!await scansDir.exists()) {
      await scansDir.create(recursive: true);
    }
    final fileName = 'scan_${DateTime.now().millisecondsSinceEpoch}.pdf';
    final dest = p.join(scansDir.path, fileName);
    await File(tempPath).copy(dest);
    return dest;
  }
}
