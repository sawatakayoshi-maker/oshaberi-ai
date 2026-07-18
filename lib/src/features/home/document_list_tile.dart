import 'package:flutter/material.dart';

import '../../data/scan_document.dart';

class DocumentListTile extends StatelessWidget {
  const DocumentListTile({
    super.key,
    required this.document,
    required this.onTap,
    required this.onDelete,
  });

  final ScanDocument document;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: const CircleAvatar(child: Icon(Icons.picture_as_pdf)),
      title: Text(
        document.title,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: Text(
        '${document.pageCount}ページ ・ ${_formatDate(document.createdAt)}',
      ),
      trailing: IconButton(
        icon: const Icon(Icons.delete_outline),
        tooltip: '削除',
        onPressed: onDelete,
      ),
      onTap: onTap,
    );
  }

  String _formatDate(DateTime t) {
    String two(int n) => n.toString().padLeft(2, '0');
    return '${t.year}/${two(t.month)}/${two(t.day)} '
        '${two(t.hour)}:${two(t.minute)}';
  }
}
