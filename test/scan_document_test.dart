import 'package:flutter_test/flutter_test.dart';
import 'package:oshaberi_scanner/src/data/scan_document.dart';

void main() {
  group('ScanDocument', () {
    test('toMap / fromMap でラウンドトリップできる', () {
      final created = DateTime.fromMillisecondsSinceEpoch(1_700_000_000_000);
      final doc = ScanDocument(
        id: 7,
        title: 'スキャン 2026/07/18 09:30',
        filePath: '/data/app/scans/scan_1.pdf',
        pageCount: 5,
        createdAt: created,
      );

      final restored = ScanDocument.fromMap(doc.toMap());

      expect(restored.id, doc.id);
      expect(restored.title, doc.title);
      expect(restored.filePath, doc.filePath);
      expect(restored.pageCount, doc.pageCount);
      expect(restored.createdAt, created);
    });

    test('id 未設定時は toMap に id を含めない（INSERT で自動採番させる）', () {
      final doc = ScanDocument(
        title: 't',
        filePath: '/p.pdf',
        pageCount: 1,
        createdAt: DateTime.fromMillisecondsSinceEpoch(0),
      );

      expect(doc.toMap().containsKey('id'), isFalse);
    });

    test('copyWith は指定フィールドのみ更新する', () {
      final doc = ScanDocument(
        title: 't',
        filePath: '/p.pdf',
        pageCount: 1,
        createdAt: DateTime.fromMillisecondsSinceEpoch(0),
      );

      final updated = doc.copyWith(id: 3, pageCount: 5);

      expect(updated.id, 3);
      expect(updated.pageCount, 5);
      expect(updated.title, 't');
      expect(updated.filePath, '/p.pdf');
    });
  });
}
