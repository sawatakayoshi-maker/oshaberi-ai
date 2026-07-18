import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/app_database.dart';
import '../data/document_repository.dart';
import '../data/scan_document.dart';
import '../data/scanner_service.dart';

final appDatabaseProvider = Provider<AppDatabase>((ref) {
  final db = AppDatabase();
  ref.onDispose(db.close);
  return db;
});

final documentRepositoryProvider = Provider<DocumentRepository>((ref) {
  return DocumentRepository(ref.watch(appDatabaseProvider));
});

final scannerServiceProvider = Provider<ScannerService>((ref) {
  return ScannerService();
});

/// 端末内に保存されたスキャン一覧を保持する。
final documentListProvider =
    AsyncNotifierProvider<DocumentListNotifier, List<ScanDocument>>(
  DocumentListNotifier.new,
);

class DocumentListNotifier extends AsyncNotifier<List<ScanDocument>> {
  @override
  Future<List<ScanDocument>> build() {
    return ref.watch(documentRepositoryProvider).fetchAll();
  }

  /// スキャナを起動して PDF を保存し、一覧の先頭に反映する。
  /// キャンセル時は null を返す。
  Future<ScanDocument?> scanAndSave() async {
    final scanner = ref.read(scannerServiceProvider);
    final repo = ref.read(documentRepositoryProvider);

    final result = await scanner.scanToPdf();
    if (result == null) return null;

    final now = DateTime.now();
    final saved = await repo.insert(
      ScanDocument(
        title: _defaultTitle(now),
        filePath: result.filePath,
        pageCount: result.pageCount,
        createdAt: now,
      ),
    );

    state = AsyncData([saved, ...?state.value]);
    return saved;
  }

  Future<void> deleteDocument(ScanDocument doc) async {
    await ref.read(documentRepositoryProvider).delete(doc);
    final current = state.value ?? const <ScanDocument>[];
    state = AsyncData(
      current.where((d) => d.id != doc.id).toList(growable: false),
    );
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(documentRepositoryProvider).fetchAll(),
    );
  }

  String _defaultTitle(DateTime t) {
    String two(int n) => n.toString().padLeft(2, '0');
    return 'スキャン ${t.year}/${two(t.month)}/${two(t.day)} '
        '${two(t.hour)}:${two(t.minute)}';
  }
}
