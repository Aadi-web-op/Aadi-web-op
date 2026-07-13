import os
import urllib.request
import urllib.parse
import base64
import json
import re

def get_access_token(client_id, client_secret, refresh_token):
    auth_str = f"{client_id}:{client_secret}"
    b64_auth = base64.b64encode(auth_str.encode()).decode()
    data = urllib.parse.urlencode({"grant_type": "refresh_token", "refresh_token": refresh_token}).encode()
    req = urllib.request.Request("https://accounts.spotify.com/api/token", data=data)
    req.add_header("Authorization", f"Basic {b64_auth}")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode())["access_token"]

def get_now_playing(access_token):
    req = urllib.request.Request("https://api.spotify.com/v1/me/player/currently-playing")
    req.add_header("Authorization", f"Bearer {access_token}")
    try:
        with urllib.request.urlopen(req) as response:
            if response.status == 204:
                return None
            return json.loads(response.read().decode())
    except Exception:
        return None

def get_recently_played(access_token):
    req = urllib.request.Request("https://api.spotify.com/v1/me/player/recently-played?limit=1")
    req.add_header("Authorization", f"Bearer {access_token}")
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            if data["items"]:
                return data["items"][0]["track"]
            return None
    except Exception:
        return None

def update_readme(track_info, is_playing):
    if not track_info:
        html = "<i>Not playing anything right now...</i>"
    else:
        name = track_info["name"]
        artist = ", ".join([artist["name"] for artist in track_info["artists"]])
        url = track_info["external_urls"]["spotify"]
        # Use the smallest image or the second one usually (around 300x300)
        images = track_info["album"]["images"]
        image_url = images[-1]["url"] if images else ""
        
        status = "🎵 Now Playing:" if is_playing else "⏸️ Last Played:"
        html = f'<a href="{url}"><img src="{image_url}" width="64" height="64" align="left" style="margin-right: 15px; border-radius: 8px;" /></a>'
        html += f'<b>{status}</b><br/>'
        html += f'<a href="{url}">{name}</a> by {artist}<br clear="left"/>'

    with open("README.md", "r", encoding="utf-8") as f:
        readme = f.read()

    new_readme = re.sub(
        r"<!-- START_SECTION:spotify -->.*<!-- END_SECTION:spotify -->",
        f"<!-- START_SECTION:spotify -->\n{html}\n<!-- END_SECTION:spotify -->",
        readme,
        flags=re.DOTALL
    )

    with open("README.md", "w", encoding="utf-8") as f:
        f.write(new_readme)

if __name__ == "__main__":
    client_id = os.environ.get("SPOTIFY_CLIENT_ID")
    client_secret = os.environ.get("SPOTIFY_CLIENT_SECRET")
    refresh_token = os.environ.get("SPOTIFY_REFRESH_TOKEN")
    
    if not client_id or not client_secret or not refresh_token:
        print("Missing environment variables.")
        exit(1)

    try:
        access_token = get_access_token(client_id, client_secret, refresh_token)
        now_playing = get_now_playing(access_token)
        
        if now_playing and now_playing.get("item"):
            update_readme(now_playing["item"], True)
            print("Updated with currently playing.")
        else:
            recently_played = get_recently_played(access_token)
            update_readme(recently_played, False)
            print("Updated with recently played.")
    except Exception as e:
        print(f"Error: {e}")
        exit(1)
