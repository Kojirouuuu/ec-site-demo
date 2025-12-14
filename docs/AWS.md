# AWS デプロイガイド

このドキュメントでは、Next.jsアプリケーションをAWS（EC2 + RDS）にデプロイする手順を説明します。

## 目次

1. [ネットワーク設計 (VPC)](#1-ネットワーク設計-vpc)
2. [VPCの作成手順](#2-vpcの作成手順)
3. [EC2インスタンスの立ち上げ](#3-ec2インスタンスの立ち上げ)
4. [接続確認](#4-接続確認)
5. [RDS用のネットワーク準備](#5-rds用のネットワーク準備)
6. [セキュリティグループの設定](#6-セキュリティグループの設定)
7. [RDS (PostgreSQL) の作成](#7-rds-postgresql-の作成)
8. [EC2の環境構築](#8-ec2の環境構築)
9. [コードをGitHubへプッシュ](#9-コードをgithubへプッシュ)
10. [EC2にコードを配置](#10-ec2にコードを配置)
11. [RDSとの接続設定](#11-rdsとの接続設定)
12. [アプリのビルドとPM2での起動](#12-アプリのビルドとpm2での起動)
13. [Nginxの設定](#13-nginxの設定)

---

## 1. ネットワーク設計 (VPC)

今回構築するネットワークの全体像です。

### 主要コンポーネント

- **VPC (Virtual Private Cloud)**: AWSの中に作る、あなた専用の独立したネットワーク空間です。
- **パブリックサブネット**: インターネットからアクセス可能なエリア。ここに**EC2（Webサーバー）**を置きます。
- **プライベートサブネット**: インターネットから直接アクセスできない安全なエリア。将来的にデータベースをここに移動させると、セキュリティが格段に向上します。（今回は準備だけしておきます）
- **インターネットゲートウェイ (IGW)**: VPCとインターネットをつなぐ出入り口です。

---

## 2. VPCの作成手順

AWSには、これらを一括で推奨設定で作ってくれる便利な機能があります。これを使えばミスなく美しい構成が作れます。

### 手順

1. AWSコンソールにログインし、左上の検索バーで「VPC」と入力してサービスを選択します。
2. ダッシュボードにあるオレンジ色のボタン **「VPC を作成」** をクリックします。

### 設定項目

| 項目 | 設定値 |
|------|--------|
| 作成するリソース | VPC など（これを選択するとサブネット等も自動で作られます） |
| 名前タグの自動生成 | `ec-site-demo`（任意のプロジェクト名） |
| IPv4 CIDR ブロック | `10.0.0.0/16`（デフォルトのままでOK） |
| アベイラビリティーゾーン (AZ) の数 | `2` |
| パブリックサブネットの数 | `2` |
| プライベートサブネットの数 | `2` |
| NAT ゲートウェイ | `なし` |
| VPC エンドポイント | `なし` |

> **⚠️ 重要**: NAT ゲートウェイを有料（あり）にすると高額な料金がかかります。今回はEC2自体がパブリックにあるため不要です。

### 確認と作成

画面右側にプレビューが表示されます。「VPC」「サブネット」「ルートテーブル」「インターネットゲートウェイ」が含まれていることを確認し、**「VPC を作成」** をクリックしてください。

完了画面が出たら成功です。

---

## 3. EC2インスタンスの立ち上げ

ネットワークという「土地」ができたので、そこに「家（サーバー）」を建てます。

### 手順

1. AWSコンソール左上の検索バーで「EC2」と入力して移動します。
2. オレンジ色のボタン **「インスタンスを起動」** をクリックします。

以下の設定で、Webサーバー兼DBサーバーとなるマシンを作成します。

### 1. 名前とOS

- **名前**: `ec-site-demo-nextjs-server`
- **OS (AMI)**: Amazon Linux 2023 を選択
- **バージョン**: Amazon Linux 2023 (HVM) など、最新のAMIを選びます。

> **💡 解説**: Amazon Linux 2023はAWSが最適化したLinuxディストリビューションで、AWSサービスとの統合が優れています。

### 2. インスタンスタイプ

- **インスタンスタイプ**: `t3.micro` または `t3.medium`

無料利用枠の対象になっているものを選んでください。

### 3. キーペア (ログイン用の鍵)

1. **キーペア名**: **「新しいキーペアの作成」** をクリック
2. **名前**: `test`
3. **タイプ**: `RSA`
4. **形式**: `.pem` (Mac/Linux用) または `.ppk` (Windows + PuTTY用)

> **💡 解説**: WindowsでもPowerShellやVSCodeを使うなら `.pem` で大丈夫です。

5. **「キーペアを作成」** をクリックすると、ファイルがダウンロードされます。

> **⚠️ 重要**: このファイルは絶対に無くさないでください。再発行できません。PCの安全な場所（`~/.ssh/` など）に保存してください。

### 4. ネットワーク設定 (重要！)

**「編集」**ボタンを押して、先ほど作ったVPCを指定します。

- **VPC**: `ec-site-demo-vpc`（先ほど作ったもの）
- **サブネット**: `ec-site-demo-subnet-public1-ap-northeast-1a`（必ずパブリックを選んでください）
- **パブリック IP の自動割り当て**: 有効化（これがないとネットからアクセスできません）

#### ファイアウォール (セキュリティグループ)

- **セキュリティグループを作成する** を選択
- **グループ名**: `sg-<id> - ec-site-demo-nextjs`
- **説明**: `Allow SSH and HTTP`

#### インバウンドセキュリティグループのルール

| タイプ | ポート | ソース |
|--------|--------|--------|
| SSH | 22 | 自分のIP (安全のため、自宅のIPのみに限定することを強く推奨します) |
| HTTP | 80 | 任意の場所 (0.0.0.0/0) |
| HTTPS | 443 | 任意の場所 (0.0.0.0/0) |

### 5. ストレージ

8 GiB (デフォルト) でOKですが、余裕を持って **20 GiB** にしておくと安心です（無料枠は30 GiBまで）。

### 作成完了

最後に画面右側の **「インスタンスを起動」** をクリックしてください。

---

## 4. 接続確認

インスタンスの状態が「実行中」になったら、接続してみましょう。

### 手順

1. インスタンス一覧から作成したインスタンスを選択し、**「パブリック IPv4 アドレス」** をコピーします（例: `54.123.45.67`）。
2. ご自身のPCのターミナルを開きます。
3. ダウンロードしたキーペア（`test.pem`）がある場所に移動します。
4. キーの権限を変更します（Mac/Linuxの場合必須）。

```bash
chmod 400 test.pem
```

5. SSHで接続します。

```bash
ssh -i "test.pem" ec2-user@<コピーしたパブリックIP>
```

`Are you sure you want to continue connecting?` と聞かれたら `yes` と入力。

`[ec2-user@ip-10-0-1-xx ~]$` のような表示が出れば、無事にAWSのサーバーに入ることができました！

---

## 5. RDS用のネットワーク準備（サブネット追加）

RDSを配置するための「予備の場所」を作ります。

### 手順

1. AWSコンソールで **「VPC」** → 左メニュー **「サブネット」** を開きます。
2. **「サブネットを作成」** をクリック。

### 設定内容

- **VPC ID**: 先ほど作った `ec-site-demo-vpc` を選択
- **サブネット名**: `ec-site-demo-subnet-private2-ap-northeast-1c`
- **アベイラビリティーゾーン**: **重要！** 先ほど作ったサブネットとは別のものを選んでください（例: 最初が `ap-northeast-1a` なら、ここは `ap-northeast-1c` など）
- **IPv4 CIDR ブロック**: `10.0.2.0/24`（最初のサブネットと被らない範囲）

3. **「サブネットを作成」** をクリック。

これでRDSを作る準備が整いました。

---

## 6. セキュリティグループの設定 (EC2とRDSの連携)

「Webサーバー(EC2)からしかデータベース(RDS)にアクセスできない」という安全なルールを作ります。

### 手順

1. AWSコンソールで **「EC2」** → 左メニュー **「セキュリティグループ」** を選択。
2. **「セキュリティグループを作成」** をクリック。

### 設定内容

- **セキュリティグループ名**: `sg-<id> - ec-site-demo-rds`
- **説明**: `Allow DB access from Web Server`
- **VPC**: `ec-site-demo-vpc`

#### インバウンドルール (重要)

- **タイプ**: PostgreSQL (ポート5432)
- **ソース**: **カスタム** を選択し、検索ボックスをクリックして `sg-<id> - ec-site-demo-nextjs` (セクション3で作ったWebサーバーのセキュリティグループ) を選択します。

> **💡 解説**: これにより、IPアドレスが変わっても「あのWebサーバーグループからのアクセスなら許可する」という動的なルールになります。

3. **「セキュリティグループを作成」** をクリック。

---

## 7. RDS (PostgreSQL) の作成

いよいよデータベース本体を作成します。

### 手順

1. AWSコンソール検索バーで **「RDS」** と検索して移動。
2. **「データベースの作成」** をクリック。

以下の設定で進めてください（コストを抑える設定です）。

### 1. データベースの作成方法

- **作成方法**: 標準作成
- **エンジンのタイプ**: PostgreSQL
- **エンジンバージョン**: PostgreSQL 16.x (または15.x。Next.js/PrismaならどれでもOK)
- **テンプレート**: **無料利用枠** (これを選択すると自動的に安価な設定になります)

### 2. 設定

- **DB インスタンス識別子**: `ec-site-demo-db`
- **マスターユーザー名**: `postgres`
- **マスターパスワード**: 複雑なパスワードを設定し、必ずメモしてください。

### 3. インスタンス設定

- **DB インスタンスクラス**: `db.t3.micro` (または `db.t4g.micro`)

### 4. 接続 (重要！)

- **VPC**: `ec-site-demo-vpc`
- **DB サブネットグループ**: 新しい DB サブネットグループの作成
- **パブリックアクセス**: **なし**（セキュリティのため、インターネットから直接繋がせない設定にします）
- **VPC セキュリティグループ**: 既存の選択 → 先ほど作った `sg-<id> - ec-site-demo-rds` を選択し、デフォルトの `default` は×ボタンで削除します

### 5. 追加設定

- **最初のデータベース名**: `ec_site_demo`（ここに入力しないとDBが作成されず、後で手動作成が必要になります）

### 作成完了

最後に画面下の **「データベースの作成」** をクリックします。

> **⏱️ 注意**: 作成完了まで5〜10分ほどかかります。ステータスが「利用可能」になるのを待ちましょう。

---

## 8. EC2の環境構築 (Node.js, Nginx, PM2)

RDSができるのを待つ間に、Webサーバー(EC2)の中身を整えます。先ほどのターミナル（SSH接続中）に戻って、以下のコマンドを順番に実行してください。

### 1. システムの更新とツールのインストール

```bash
sudo dnf update -y
sudo dnf install -y nginx git unzip
```

### 2. Node.js のインストール (nvmを使用)

Amazon Linux 2023では、Node Version Manager (nvm) を使用してNode.jsをインストールすることを推奨します。これにより、複数のNode.jsバージョンを管理できます。

> **参考**: [AWS公式ドキュメント - Amazon EC2 インスタンスでの Node.js のセットアップ](https://docs.aws.amazon.com/ja_jp/sdk-for-javascript/v2/developer-guide/setting-up-node-on-ec2-instance.html)

```bash
# nvmをインストール
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```

> **⚠️ 警告**: AWSはこのコードを制御していません。実行する前に、その信頼性と整合性を検証する必要があります。

```bash
# nvmをロード
source ~/.bashrc

# Node.jsの最新LTS版をインストール
nvm install --lts
```

確認: `node -v` を実行し、v20.x.xなどのLTSバージョンが表示されればOKです。

> **💡 注意**: Node.jsのインストールは、現在のAmazon EC2セッションにのみ適用されます。CLIセッションを再開する場合は、`source ~/.bashrc` を実行してnvmをロードする必要があります。

### 3. PM2 (プロセス管理ツール) のインストール

アプリが落ちても自動再起動させたり、バックグラウンドで動かし続けるために使います。

```bash
npm install -g pm2
```

---

## 9. コードをGitHubへプッシュ (ローカルでの作業)

まだリポジトリがない場合を想定し、手元のコードをGitHubにアップロードします。

### 手順

1. **GitHubで新規リポジトリ作成**: ブラウザでGitHubを開き、「New Repository」から空のリポジトリ（例: `ec-site-demo`）を作成します。

2. **ローカルでコマンド実行**: VSCodeなどのターミナルで以下を実行します。

```bash
# まだgit初期化していなければ
git init
git add .
git commit -m "Initial commit"
git branch -M main
# 次の行はあなたのリポジトリURLに書き換えてください
git remote add origin https://github.com/YOUR_NAME/ec-site-demo.git
git push -u origin main
```

> **🔒 セキュリティ**: `.env` ファイルは自動的に無視（`.gitignore`）される設定になっているはずなので、パスワードが流出する心配はありません。

---

## 10. EC2にコードを配置 (サーバーでの作業)

ここからは **AWS EC2のターミナル（SSH接続画面）** での作業です。

### リポジトリのクローン

```bash
# ホームディレクトリへ移動
cd ~

# クローン (URLはあなたのものに変えてください)
git clone https://github.com/YOUR_NAME/ec-site-demo.git

# フォルダへ移動
cd ec-site-demo

# 初期データcsv保管用ディレクトリ作成
mkdir -p ~/ec-site-demo/archive
```

### データセット（CSVファイル）のアップロード

シード処理で使用するCSVファイルをEC2にアップロードします。

#### 1. データセットのダウンロード（ローカルPCでの作業）

1. **Kaggleからデータセットをダウンロード**: 
   - [Brazilian E-Commerce Public Dataset by Olist](https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce) にアクセス
   - Kaggleアカウントでログイン（必要に応じてアカウント作成）
   - 「Download」ボタンをクリックしてデータセットをダウンロード
   - ダウンロードしたZIPファイルを解凍

2. **プロジェクトの適切な場所に保存**: 
   - 解凍したCSVファイルを、ローカルのプロジェクトの `archive/` ディレクトリに配置します
   - 例: `/Users/user/ec-site-demo/archive/` にCSVファイルを配置
   - プロジェクトルートの `archive/` ディレクトリが存在しない場合は、事前に作成してください

#### 2. EC2へのアップロード（ローカルPCの別ターミナルで実行）

EC2へのSSH接続を維持したまま、**新しいターミナルウィンドウ**を開いて、以下のコマンドを実行します。

> **💡 注意**: 以下のコマンドのパスとホスト名は、実際の環境に合わせて変更してください。

```bash
# EC2のパブリックIPアドレスまたはパブリックDNS名を確認
# AWSコンソールのEC2インスタンス一覧から確認できます

# CSVファイルをEC2にアップロード
# キーペアファイルのパスとローカルのCSVファイルのパス、EC2のホスト名を実際の環境に合わせて変更してください
scp -i "test.pem" /Users/user/ec-site-demo/archive/* ec2-user@<EC2のパブリックDNS名またはIP>:~/ec-site-demo/archive/
```

> **⚠️ 重要**: 
> - `<EC2のパブリックDNS名またはIP>` は、実際のEC2インスタンスのパブリックDNS名またはIPアドレスに置き換えてください
> - 例: `ec2-user@ec2-00-000-000-00.ap-northeast-1.compute.amazonaws.com` または `ec2-user@00.000.00.00`
> - キーペアファイル（`test.pem`）は、ダウンロードした場所のパスを指定してください

#### 3. アップロードの確認（EC2のSSH接続ターミナルで確認）

EC2にSSH接続しているターミナルに戻り、ファイルが正しくアップロードされたか確認します。

```bash
# ec-site-demoディレクトリにいることを確認
cd ~/ec-site-demo

# archiveディレクトリの内容を確認
ls -la archive/
```

CSVファイルが表示されれば成功です。

### 依存関係のインストール

```bash
npm install
```

> **💡 注意**: 警告が出てもエラーでなければ大丈夫です。

---

## 11. RDSとの接続設定

ローカルではDockerのDBを使っていましたが、本番では先ほど作ったAmazon RDSを使います。そのための設定ファイルを作成します。

### 手順

1. **RDSのエンドポイント確認**: AWSコンソールの「RDS」→「データベース」→「ec-site-demo-db」をクリックし、**「接続とセキュリティ」**タブにある **「エンドポイント」**（例: `ec-site-demo-db.xxxx.ap-northeast-1.rds.amazonaws.com`）をコピーします。

2. **環境変数ファイルの作成**: EC2上で `.env` ファイルを作ります。

```bash
nano .env
```

3. **内容の記述**: 以下を貼り付け、部分的に書き換えてください。

```env
# ユーザー名: postgres（デフォルト）
# パスワード: RDS作成時に設定したパスワード
# エンドポイント: さっきコピーしたURL
# DB名: ec_site_demo（初期データベース名）
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@YOUR_RDS_ENDPOINT:5432/ec_site_demo?schema=public"
```

書き終わったら `Ctrl + O` → `Enter` で保存、`Ctrl + X` で終了します。

4. **Prismaクライアントの生成**: データベース接続に必要なPrismaクライアントを生成します。

```bash
npx prisma generate
```

5. **データベースの同期**: RDSに対してテーブル作成を行います。

```bash
# テーブル作成
npx prisma db push
```

6. **データ投入 (シード)**: データベースに初期データを投入します。

> **⚠️ TLS証明書検証エラーについて**: 
> 
> RDS接続時に `PrismaClientKnownRequestError` が発生する場合があります。これは、TLS接続自体は成立しているものの、Node.js/Prisma側の証明書検証（CAチェーン検証）が通っていないためです。
> 
> この問題を回避するために、一時的に証明書検証を無効化してシードを実行します。

```bash
# TLS証明書検証を無効化（RDS接続時の証明書検証エラーを回避）
export NODE_TLS_REJECT_UNAUTHORIZED=0

# データ投入 (シード実行)
npm run seed

# シード実行後、証明書検証を元に戻す（セキュリティのため重要）
unset NODE_TLS_REJECT_UNAUTHORIZED
```

> **💡 重要**: 
> - `NODE_TLS_REJECT_UNAUTHORIZED=0` は開発環境やテスト環境でのみ使用してください
> - 本番環境では適切な証明書設定（RDS CA証明書のインストールなど）を行うことを強く推奨します
> - シード実行後は必ず `unset NODE_TLS_REJECT_UNAUTHORIZED` で環境変数を削除し、証明書検証を有効に戻してください

`Seeding finished.` と出れば成功です！これでAWS上のDBにデータが入りました。

---

## 12. アプリのビルドとPM2での起動

Next.jsを本番用にビルドし、PM2を使ってバックグラウンドで起動し続けます。

### ビルド

```bash
npm run build
```

少し時間がかかります。`.next` フォルダが作成されます。

### PM2で起動

```bash
pm2 start npm --name "ec-site-demo-app" -- start
```

`ec-site-demo-app` という名前でアプリが立ち上がります。

### 自動起動設定

サーバーが再起動しても自動でアプリが立ち上がるようにします。

```bash
pm2 save
pm2 startup
```

`pm2 startup` を実行すると、コマンドが表示されます（例: `sudo env PATH=...`）。その表示されたコマンドをコピーして実行してください。

---

## 13. Nginxの設定 (リバースプロキシ)

最後に、インターネット（ポート80）からのアクセスを、Next.js（ポート3000）に転送する設定を行います。

### 設定ファイルの作成

Amazon Linux 2023では、`/etc/nginx/conf.d/` ディレクトリに設定ファイルを配置することで、Nginxの設定を管理できます。

以下のコマンドを実行して、設定ファイルを作成します。

```bash
sudo tee /etc/nginx/conf.d/ec-site-demo-nextjs.conf > /dev/null << 'EOF'

upstream nextjs_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;

    # ログ設定
    access_log /var/log/nginx/ec-site-demo-nextjs-access.log;
    error_log /var/log/nginx/ec-site-demo-nextjs-error.log;

    # クライアントボディサイズ制限
    client_max_body_size 10M;

    # プロキシ設定
    location / {
        proxy_pass http://nextjs_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # タイムアウト設定
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # ヘルスチェック用エンドポイント（オプション）
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF
```

> **💡 解説**: 
> - `upstream` ブロックでNext.jsアプリケーションのバックエンドを定義しています
> - `keepalive 64` により、接続を再利用してパフォーマンスを向上させます
> - ログファイルは `/var/log/nginx/` に保存されます
> - `/health` エンドポイントでアプリケーションの稼働状況を確認できます

### 設定ファイルの検証

設定ファイルに構文エラーがないか確認します。

```bash
sudo nginx -t
```

`nginx: configuration file /etc/nginx/nginx.conf test is successful` と表示されれば、設定ファイルに問題はありません。

### Nginxの再起動

設定を反映させます。

```bash
sudo systemctl restart nginx
```

### Nginxの状態確認

Nginxが正常に起動しているか確認します。

```bash
sudo systemctl status nginx
```

---

## 完了

これで、EC2のパブリックIPアドレスにブラウザでアクセスすると、Next.jsアプリケーションが表示されるはずです！

### 確認方法

1. EC2インスタンスの **「パブリック IPv4 アドレス」** をコピー
2. ブラウザで `http://<パブリックIP>` にアクセス
3. アプリケーションが表示されれば成功です

### ヘルスチェック

Nginxの設定で追加したヘルスチェックエンドポイントにアクセスして、サーバーが正常に動作しているか確認できます。

```bash
curl http://<パブリックIP>/health
```

`healthy` と表示されれば、Nginxが正常に動作しています。

---

## トラブルシューティング

### アプリが表示されない場合

1. **PM2の状態確認**
   ```bash
   pm2 status
   pm2 logs ec-site-demo-app
   ```

2. **Nginxの状態確認**
   ```bash
   sudo systemctl status nginx
   ```

3. **セキュリティグループの確認**
   - EC2のセキュリティグループでポート80が開いているか確認

4. **RDS接続の確認**
   - `.env` ファイルの `DATABASE_URL` が正しいか確認
   - RDSのステータスが「利用可能」になっているか確認

5. **ログの確認**
   ```bash
   # Nginxのエラーログを確認
   sudo tail -f /var/log/nginx/ec-site-demo-nextjs-error.log
   
   # Nginxのアクセスログを確認
   sudo tail -f /var/log/nginx/ec-site-demo-nextjs-access.log
   ```
