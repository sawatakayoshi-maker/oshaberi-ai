/// 端末内に保存された 1 つのスキャン結果（PDF 1 本）のメタデータ。
class ScanDocument {
  const ScanDocument({
    this.id,
    required this.title,
    required this.filePath,
    required this.pageCount,
    required this.createdAt,
  });

  final int? id;
  final String title;

  /// アプリのドキュメントディレクトリ内に保存された PDF の絶対パス。
  final String filePath;
  final int pageCount;
  final DateTime createdAt;

  ScanDocument copyWith({
    int? id,
    String? title,
    String? filePath,
    int? pageCount,
    DateTime? createdAt,
  }) {
    return ScanDocument(
      id: id ?? this.id,
      title: title ?? this.title,
      filePath: filePath ?? this.filePath,
      pageCount: pageCount ?? this.pageCount,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  Map<String, Object?> toMap() {
    return {
      if (id != null) 'id': id,
      'title': title,
      'file_path': filePath,
      'page_count': pageCount,
      'created_at': createdAt.millisecondsSinceEpoch,
    };
  }

  factory ScanDocument.fromMap(Map<String, Object?> map) {
    return ScanDocument(
      id: map['id'] as int?,
      title: map['title'] as String,
      filePath: map['file_path'] as String,
      pageCount: map['page_count'] as int,
      createdAt:
          DateTime.fromMillisecondsSinceEpoch(map['created_at'] as int),
    );
  }
}
