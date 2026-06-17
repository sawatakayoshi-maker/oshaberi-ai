# DB 設計 / ER図

開発手順 4（ER図）・5（DB設計）。実装は [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql)。

## 設計方針
- **統合 `items` テーブル** + 種別 `kind`（memo / task / idea / log）で「メモ・タスク・アイデア・人生ログ」を表現。
  共通フィールド（タイトル/本文/状態/タグ/プロジェクト）を一元化し、検索・関連付け・AI 処理を横断的に行える。
- 型固有の構造（アイデアの 4 軸スコア等）は専用カラム + `metadata JSONB` で拡張。
- **メモリーツリー**は自己参照 `tree_nodes`、**ナレッジグラフ**は `links`（item 間エッジ）で表現。
- **全テーブル RLS 有効**。`user_id = auth.uid()` で隔離。
- 全文検索は `tsvector`（`simple` 構成）+ GIN。※日本語の高精度検索は将来 pgroonga / pg_bigm を検討。

## ER図

```
auth.users ─1─┐
              │ 1:1
          profiles
              │ 1:N (user_id) ─ 全テーブルが user_id を保持（RLS 単位）
              │
   ┌──────────┼─────────────┬───────────────┬───────────────┐
   ▼          ▼             ▼               ▼               ▼
projects   tree_nodes     items           tags        timeline_events
   │           │  ▲         │  │  ▲          │
   │ 1:N       │  └─parent  │  │  └─ tree_node_id        notifications
   └───────────┼──project── ┘  │                          ai_suggestions
               │               │ N:M (item_tags)
        items.tree_node_id     └──── tags
                               │
                          attachments (item 1:N)
                               │
                          links (item ⇄ item, 有向エッジ=ナレッジグラフ)
```

## テーブル定義（要約）

### profiles
| カラム | 型 | 説明 |
|---|---|---|
| id | uuid PK → auth.users | ユーザ |
| display_name | text | 表示名 |
| settings | jsonb | UI/AI 設定 |
| created_at / updated_at | timestamptz | |

### projects
| id | uuid PK |
| user_id | uuid |
| name / description | text |
| color | text |
| status | text（active/archived/done） |
| created_at / updated_at | timestamptz |

### tree_nodes（メモリーツリー）
| id | uuid PK |
| user_id | uuid |
| parent_id | uuid → tree_nodes（自己参照, ルートは null） |
| name | text |
| position | int（兄弟内の並び順） |
| created_at | timestamptz |

### items（メモ/タスク/アイデア/ログの統合）
| id | uuid PK |
| user_id | uuid |
| kind | item_kind enum（memo/task/idea/log） |
| title / body | text |
| status | text（タスク: todo/doing/done。汎用ステータス） |
| priority | smallint（0=なし,1=低,2=中,3=高） |
| due_at / remind_at | timestamptz（タスク） |
| project_id | uuid → projects |
| tree_node_id | uuid → tree_nodes |
| source | text（quick_capture/manual） |
| ai_summary | text（AI 要約） |
| scores | jsonb（アイデア: {market,feasibility,profitability,future}） |
| url | text |
| metadata | jsonb |
| search_tsv | tsvector（生成列, FTS） |
| created_at / updated_at | timestamptz |

### tags / item_tags
- tags(id, user_id, name, color) — user 内 name ユニーク
- item_tags(item_id, tag_id) — N:M

### attachments
| id, user_id, item_id, kind(file/url/audio/image), url, storage_path, mime, created_at |

### links（ナレッジグラフのエッジ）
| id, user_id, source_item_id, target_item_id, relation(text), created_at | — (source,target,relation) ユニーク

### timeline_events（人生タイムライン）
| id, user_id, title, description, event_date(date), item_id(任意), created_at |

### notifications
| id, user_id, type, title, body, item_id, read_at, created_at |

### ai_suggestions（AI 提案/知識進化）
| id, user_id, type(related/revive/idea/...), payload jsonb, item_id, status(open/dismissed/accepted), created_at |

詳細な制約・インデックス・RLS ポリシー・FTS トリガは SQL を参照してください。
