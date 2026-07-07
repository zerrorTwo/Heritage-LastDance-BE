import os
import sys
import subprocess
import shutil
import paramiko

SERVER = os.environ.get("DEPLOY_SERVER", "")
PORT = int(os.environ.get("DEPLOY_PORT", "22"))
USER = os.environ.get("DEPLOY_USER", "")
PASSWORD = os.environ.get("DEPLOY_PASSWORD", "")
REMOTE_DIR = "/heritage-stag/BE"
COMPOSE_FILE = "docker-compose.prod.yml"
SERVICE = "heritage-be"

LOCAL_DIR = os.path.dirname(os.path.abspath(__file__))

SYNC_FILES = ["Dockerfile.prod", "docker-compose.prod.yml", "package.json", "package-lock.json", "config.yaml", ".env"]
SYNC_DIRS = ["dist"]


class Deployer:
    def __init__(self):
        self.client = None
        self.sftp = None

    def connect(self):
        self.client = paramiko.SSHClient()
        self.client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        self.client.connect(SERVER, PORT, USER, PASSWORD, timeout=60)
        self.sftp = self.client.open_sftp()
        print("  Connected.")

    def close(self):
        if self.sftp:
            self.sftp.close()
        if self.client:
            self.client.close()

    def run(self, cmd, desc="", quiet=False):
        if desc:
            print(f"  [{desc}]")
        if not quiet:
            print(f"  $ {cmd}")
        stdin, stdout, stderr = self.client.exec_command(cmd)
        out = stdout.read().decode()
        err = stderr.read().decode()
        if out.strip() and not quiet:
            print(out.strip())
        if err.strip():
            print(f"  ! {err.strip()}")
        return out, err

    def mkdir_p(self, path):
        self.run(f"mkdir -p '{path}'", quiet=True)

    def mkdir_remote(self, path):
        try:
            self.sftp.mkdir(path)
        except IOError:
            pass

    def upload_file(self, local_path, remote_path):
        print(f"  Uploading: {os.path.basename(local_path)}")
        self.sftp.put(local_path, remote_path)

    def upload_dir(self, local_dir, remote_base):
        self.mkdir_p(remote_base)
        for root, dirs, files in os.walk(local_dir):
            dirs[:] = [d for d in dirs if d not in ["__pycache__", ".git", ".venv", "node_modules"]]
            for d in dirs:
                rp = os.path.join(remote_base, os.path.relpath(os.path.join(root, d), local_dir)).replace("\\", "/")
                self.mkdir_p(rp)
            for f in files:
                if f.endswith(".pyc"):
                    continue
                lp = os.path.join(root, f)
                rel = os.path.relpath(lp, local_dir)
                rp = os.path.join(remote_base, rel).replace("\\", "/")
                print(f"  Uploading: {rel}")
                self.sftp.put(lp, rp)


def build_local():
    print("\n[build-local] Running npm run build...")
    tsc = os.path.join(LOCAL_DIR, "node_modules", ".bin", "tsc")
    if not os.path.exists(tsc):
        tsc = os.path.join(LOCAL_DIR, "node_modules", "typescript", "bin", "tsc")
    subprocess.run(f"node {tsc} -p tsconfig.json", cwd=LOCAL_DIR, shell=True, check=True)

    src_templates = os.path.join(LOCAL_DIR, "src", "pkg", "mail", "templates")
    dst_templates = os.path.join(LOCAL_DIR, "dist", "pkg", "mail", "templates")
    if os.path.isdir(src_templates):
        print("  Copying mail templates to dist...")
        if os.path.exists(dst_templates):
            shutil.rmtree(dst_templates)
        shutil.copytree(src_templates, dst_templates)

    print("  Build done.")


def sync():
    d = Deployer()
    try:
        d.connect()
        print("\n[sync] Creating remote directory...")
        d.run(f"mkdir -p {REMOTE_DIR}")

        print("[sync] Uploading files...")
        for f in SYNC_FILES:
            local_f = os.path.join(LOCAL_DIR, f)
            if os.path.exists(local_f):
                d.upload_file(local_f, f"{REMOTE_DIR}/{f}")
            else:
                print(f"  WARNING: {f} not found, skipping")

        for dname in SYNC_DIRS:
            local = os.path.join(LOCAL_DIR, dname)
            if os.path.isdir(local):
                d.upload_dir(local, f"{REMOTE_DIR}/{dname}")

        print("  Sync done.")
    finally:
        d.close()


def build():
    d = Deployer()
    try:
        d.connect()
        print("\n[build] Building Docker image on server...")
        d.run(f"cd {REMOTE_DIR} && docker compose -f {COMPOSE_FILE} build")
    finally:
        d.close()


def up():
    d = Deployer()
    try:
        d.connect()
        print(f"\n[up] Starting {SERVICE}...")
        d.run(f"cd {REMOTE_DIR} && docker compose -f {COMPOSE_FILE} up -d")
        print(f"  BE: http://{SERVER}:3001")
    finally:
        d.close()


def down():
    d = Deployer()
    try:
        d.connect()
        print(f"\n[down] Stopping {SERVICE} (data preserved)...")
        d.run(f"cd {REMOTE_DIR} && docker compose -f {COMPOSE_FILE} down")
    finally:
        d.close()


def restart():
    d = Deployer()
    try:
        d.connect()
        print(f"\n[restart] Restarting {SERVICE}...")
        d.run(f"cd {REMOTE_DIR} && docker compose -f {COMPOSE_FILE} down")
        d.run(f"cd {REMOTE_DIR} && docker compose -f {COMPOSE_FILE} up -d")
    finally:
        d.close()


def deploy():
    build_local()
    sync()
    build()
    up()
    print(f"\n=== DEPLOY DONE: http://{SERVER}:3001 ===")


def logs():
    d = Deployer()
    try:
        d.connect()
        d.run(f"cd {REMOTE_DIR} && docker compose -f {COMPOSE_FILE} logs -f --tail=100")
    finally:
        d.close()


def status():
    d = Deployer()
    try:
        d.connect()
        d.run(f"cd {REMOTE_DIR} && docker compose -f {COMPOSE_FILE} ps")
    finally:
        d.close()


ACTIONS = {
    "build-local": build_local,
    "sync": sync,
    "build": build,
    "up": up,
    "down": down,
    "restart": restart,
    "deploy": deploy,
    "logs": logs,
    "status": status,
}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python deploy.py <action>")
        print(f"Actions: {', '.join(ACTIONS.keys())}")
        sys.exit(1)

    action = sys.argv[1]
    if action in ACTIONS:
        ACTIONS[action]()
    else:
        print(f"Unknown action: {action}")
        print(f"Available: {', '.join(ACTIONS.keys())}")
        sys.exit(1)
