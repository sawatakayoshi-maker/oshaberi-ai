import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/scan_document.dart';
import '../../providers/providers.dart';
import '../viewer/pdf_viewer_screen.dart';
import 'document_list_tile.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final docsAsync = ref.watch(documentListProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('書類スキャン')),
      body: docsAsync.when(
        data: (docs) => _DocumentList(documents: docs),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => _ErrorView(
          message: '$e',
          onRetry: () => ref.read(documentListProvider.notifier).refresh(),
        ),
      ),
      floatingActionButton: const _ScanButton(),
    );
  }
}

class _ScanButton extends ConsumerStatefulWidget {
  const _ScanButton();

  @override
  ConsumerState<_ScanButton> createState() => _ScanButtonState();
}

class _ScanButtonState extends ConsumerState<_ScanButton> {
  bool _busy = false;

  Future<void> _scan() async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final saved =
          await ref.read(documentListProvider.notifier).scanAndSave();
      if (!mounted) return;
      if (saved != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('保存しました（${saved.pageCount}ページ）')),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('スキャンに失敗しました: $e')),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return FloatingActionButton.extended(
      onPressed: _busy ? null : _scan,
      icon: _busy
          ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Colors.white,
              ),
            )
          : const Icon(Icons.document_scanner),
      label: Text(_busy ? '保存中…' : 'スキャン'),
    );
  }
}

class _DocumentList extends ConsumerWidget {
  const _DocumentList({required this.documents});

  final List<ScanDocument> documents;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (documents.isEmpty) {
      return const _EmptyView();
    }
    return RefreshIndicator(
      onRefresh: () => ref.read(documentListProvider.notifier).refresh(),
      child: ListView.separated(
        padding: const EdgeInsets.only(top: 8, bottom: 96),
        itemCount: documents.length,
        separatorBuilder: (_, __) => const Divider(height: 1, indent: 72),
        itemBuilder: (context, index) {
          final doc = documents[index];
          return DocumentListTile(
            document: doc,
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => PdfViewerScreen(document: doc),
              ),
            ),
            onDelete: () => _confirmDelete(context, ref, doc),
          );
        },
      ),
    );
  }

  Future<void> _confirmDelete(
    BuildContext context,
    WidgetRef ref,
    ScanDocument doc,
  ) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('削除しますか？'),
        content: Text('「${doc.title}」を削除します。この操作は取り消せません。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('キャンセル'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('削除'),
          ),
        ],
      ),
    );
    if (ok == true) {
      await ref.read(documentListProvider.notifier).deleteDocument(doc);
    }
  }
}

class _EmptyView extends StatelessWidget {
  const _EmptyView();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.document_scanner_outlined,
              size: 72,
              color: Theme.of(context).colorScheme.outline,
            ),
            const SizedBox(height: 16),
            const Text(
              'まだ書類がありません',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            Text(
              '右下の「スキャン」から撮影してください。',
              textAlign: TextAlign.center,
              style: TextStyle(color: Theme.of(context).colorScheme.outline),
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 56),
            const SizedBox(height: 16),
            Text('読み込みに失敗しました\n$message', textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton(onPressed: onRetry, child: const Text('再試行')),
          ],
        ),
      ),
    );
  }
}
