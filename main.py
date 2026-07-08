import discord
from discord.ext import commands, tasks
import os
import sys
import time
import random
import asyncio
from datetime import datetime
from dotenv import load_dotenv
from pymongo import MongoClient
import certifi
from aiohttp import web
import secrets
from questions import KHMER_QUIZ

# Force UTF-8 encoding for stdout/stderr to support emojis on Windows
if sys.platform.startswith('win'):
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# ════════════════════════════════════════════
# 🟢 1. SETUP & DATABASE
# ════════════════════════════════════════════
load_dotenv()
TOKEN     = os.getenv('DISCORD_TOKEN')
MONGO_URL = os.getenv('MONGO_URL')

try:
    mongo_client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000, tlsCAFile=certifi.where())
    db           = mongo_client['discord_bot']
    collection   = db['voice_activity']   # សម្រាប់ស្ទង់ម៉ោង Voice
    money_col    = db['users']            # សម្រាប់លុយ Kla Klouk
    print("✅ [DATABASE] Connected successfully!")
except Exception as e:
    print(f"❌ [DATABASE] Error: {e}")
    collection = None
    money_col  = None

# ════════════════════════════════════════════
# 🔵 2. CONFIGURATION (IDs)
# ════════════════════════════════════════════
STAY_VOICE_CHANNEL_ID  = 1495160098216218675
WELCOME_CHANNEL_ID     = 1492953340584399009
LEADERBOARD_CHANNEL_ID = 1492953771423043695
CREATE_CHANNEL_ID      = 1496428434107138148
PARENT_CATEGORY_ID     = 1494236441725767701

# 🎭 Auto Role — ID of role to give every new member
AUTO_ROLE_ID = 0  # ← ដាក់ ID Role របស់អ្នក

def load_settings():
    global STAY_VOICE_CHANNEL_ID, WELCOME_CHANNEL_ID, LEADERBOARD_CHANNEL_ID, CREATE_CHANNEL_ID, PARENT_CATEGORY_ID, AUTO_ROLE_ID
    if db is not None:
        try:
            settings_col = db['settings']
            for doc in settings_col.find():
                key = doc.get("key")
                val = doc.get("value")
                if val is not None:
                    try:
                        val_int = int(val)
                    except ValueError:
                        val_int = val
                    if key == "STAY_VOICE_CHANNEL_ID": STAY_VOICE_CHANNEL_ID = val_int
                    elif key == "WELCOME_CHANNEL_ID": WELCOME_CHANNEL_ID = val_int
                    elif key == "LEADERBOARD_CHANNEL_ID": LEADERBOARD_CHANNEL_ID = val_int
                    elif key == "CREATE_CHANNEL_ID": CREATE_CHANNEL_ID = val_int
                    elif key == "PARENT_CATEGORY_ID": PARENT_CATEGORY_ID = val_int
                    elif key == "AUTO_ROLE_ID": AUTO_ROLE_ID = val_int
            print("✅ [SETTINGS] Configuration loaded from MongoDB.")
        except Exception as e:
            print(f"❌ [SETTINGS] Load error: {e}")

def save_setting(key, val):
    global STAY_VOICE_CHANNEL_ID, WELCOME_CHANNEL_ID, LEADERBOARD_CHANNEL_ID, CREATE_CHANNEL_ID, PARENT_CATEGORY_ID, AUTO_ROLE_ID
    try:
        val_int = int(val)
    except ValueError:
        val_int = val

    if key == "STAY_VOICE_CHANNEL_ID": STAY_VOICE_CHANNEL_ID = val_int
    elif key == "WELCOME_CHANNEL_ID": WELCOME_CHANNEL_ID = val_int
    elif key == "LEADERBOARD_CHANNEL_ID": LEADERBOARD_CHANNEL_ID = val_int
    elif key == "CREATE_CHANNEL_ID": CREATE_CHANNEL_ID = val_int
    elif key == "PARENT_CATEGORY_ID": PARENT_CATEGORY_ID = val_int
    elif key == "AUTO_ROLE_ID": AUTO_ROLE_ID = val_int

    if db is not None:
        try:
            settings_col = db['settings']
            settings_col.update_one({"key": key}, {"$set": {"value": val_int}}, upsert=True)
            print(f"✅ [SETTINGS] Saved key {key} to db: {val_int}")
        except Exception as e:
            print(f"❌ [SETTINGS] Save error: {e}")

# Load active configuration settings
load_settings()

# 🏆 Rank Roles — (min_hours, role_id, label)
RANK_ROLES = [
    (1,   0, "🌱 Newcomer"),   # ← ដាក់ Role IDs
    (5,   0, "🔥 Active"),
    (20,  0, "💎 Veteran"),
    (50,  0, "👑 Legend"),
]

intents = discord.Intents.all()
bot = commands.Bot(command_prefix='.', intents=intents)
start_time = time.time()
active_sessions = {}
room_data = {}   # voice_channel_id → {"owner": member_id, "category": category_id}

# ════════════════════════════════════════════
# 🟡 3. HELPER FUNCTIONS
# ════════════════════════════════════════════
def format_time(seconds):
    hours, remainder = divmod(int(seconds), 3600)
    minutes, _ = divmod(remainder, 60)
    return f"{hours:02}h {minutes:02}m"

async def _save_voice_time(user_id: str, duration: float):
    if collection is None or duration < 1:
        return
    today = datetime.now().strftime("%b %d, %Y")
    def run():
        collection.update_one(
            {"user_id": user_id},
            {"$inc": {"total_seconds": duration}},
            upsert=True
        )
        collection.update_one(
            {"user_id": user_id, "first_join": {"$exists": False}},
            {"$set": {"first_join": today}}
        )
    await asyncio.to_thread(run)

async def force_join_stay_channel():
    channel = bot.get_channel(STAY_VOICE_CHANNEL_ID)
    if not channel:
        print(f"❌ [VOICE ERROR] Could not find channel ID: {STAY_VOICE_CHANNEL_ID}")
        return
    existing_vc = discord.utils.get(bot.voice_clients, guild=channel.guild)

    if existing_vc and existing_vc.channel.id == STAY_VOICE_CHANNEL_ID and existing_vc.is_connected():
        return

    if existing_vc:
        await existing_vc.disconnect(force=True)
        await asyncio.sleep(1)

    try:
        await channel.connect(reconnect=True, timeout=20)
        print(f"🎙️ [VOICE] Bot joined: {channel.name}")
    except Exception as e:
        print(f"❌ [VOICE ERROR]: {e}")

async def update_rank_role(member, total_seconds):
    """Give the highest earned rank role and remove lower ones."""
    if not RANK_ROLES or all(r[1] == 0 for r in RANK_ROLES):
        return
    total_hours = total_seconds / 3600
    earned_role_id = None
    for min_hours, role_id, _ in RANK_ROLES:
        if total_hours >= min_hours and role_id != 0:
            earned_role_id = role_id

    all_rank_ids = {r[1] for r in RANK_ROLES if r[1] != 0}
    for role_id in all_rank_ids:
        role = member.guild.get_role(role_id)
        if not role:
            continue
        if role_id == earned_role_id:
            if role not in member.roles:
                await member.add_roles(role)
        else:
            if role in member.roles:
                await member.remove_roles(role)

async def get_leaderboard_embed():
    if collection is None:
        return discord.Embed(description="Database Error")

    def run():
        return list(collection.find().sort("total_seconds", -1).limit(10))
    data = await asyncio.to_thread(run)
    embed = discord.Embed(
        title="✨ TEMPERATURE VOICE LEADERBOARD ✨",
        description="🏆 តារាងអ្នកសកម្មបំផុតក្នុង Voice Channels គ្រប់ជាន់ថ្នាក់\n" + "—" * 25,
        color=0x2b2d31
    )

    if not data:
        embed.description += "\n⌛ មិនទាន់មានទិន្នន័យនៅឡើយទេ..."
    else:
        top1 = data[0]
        try:
            u1 = bot.get_user(int(top1['user_id'])) or await bot.fetch_user(int(top1['user_id']))
        except Exception:
            u1 = None
        u1_text   = u1.mention if u1 else f"ID: {top1['user_id']}"
        join_date = top1.get('first_join', "Unknown")

        if u1:
            embed.set_thumbnail(url=u1.display_avatar.url)

        embed.add_field(
            name="🥇 CURRENT CHAMPION",
            value=(f"┣ 🥇 01 | **{u1_text}**\n"
                   f"┣ ⌚ Time: `{format_time(top1['total_seconds'])}`\n"
                   f"┗ 📅 Joined: `{join_date}`\n" + "—" * 20),
            inline=False
        )

        contenders_text = ""
        medals = {2: "🥈", 3: "🥉"}
        for i, info in enumerate(data[1:], start=2):
            try:
                user = bot.get_user(int(info['user_id'])) or await bot.fetch_user(int(info['user_id']))
            except Exception:
                user = None
            duration     = format_time(info['total_seconds'])
            name_display = (
                user.mention if user and i <= 3
                else (f"**{user.name}**" if user else f"ID: {info['user_id']}")
            )
            medal = medals.get(i, "🏅")
            contenders_text += f"{medal} `{i:02d}` | {name_display} — `{duration}`\n"

        if contenders_text:
            embed.add_field(name="📜 TOP CONTENDERS", value=contenders_text, inline=False)

    embed.set_footer(text="Temperature System • Daily Refresh", icon_url=bot.user.display_avatar.url)
    embed.timestamp = datetime.now()
    return embed

# Kla Klouk balance helpers
async def get_balance(user_id):
    if money_col is None:
        return 1000
    u_id_str = str(user_id)
    def run():
        user = money_col.find_one({"user_id": u_id_str})
        if not user:
            # Fallback check for legacy integer key
            user = money_col.find_one({"user_id": int(user_id)})
            if user:
                # Migrate to string key
                money_col.update_one({"user_id": int(user_id)}, {"$set": {"user_id": u_id_str}})
        return user.get('balance', 1000) if user else 1000
    return await asyncio.to_thread(run)

async def update_balance(user_id, amount):
    if money_col is None:
        return 1000
    u_id_str = str(user_id)
    current_bal = await get_balance(user_id)
    new_bal     = current_bal + amount
    def run():
        # Delete any legacy integer entries to prevent duplicate accounts
        try:
            money_col.delete_many({"user_id": int(user_id)})
        except Exception:
            pass
        money_col.update_one({"user_id": u_id_str}, {"$set": {"balance": new_bal}}, upsert=True)
    await asyncio.to_thread(run)
    return new_bal

# ════════════════════════════════════════════
# 🌐 ADMIN DASHBOARD REST APIs & ROUTING
# ════════════════════════════════════════════
dashboard_tokens = set()
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

def auth_required(handler):
    async def wrapper(request):
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '').strip() if auth_header.startswith('Bearer ') else ''
        if not token or token not in dashboard_tokens:
            return web.json_response({"error": "Unauthorized"}, status=401)
        return await handler(request)
    return wrapper

# Auth verification endpoint
@auth_required
async def api_verify(request):
    return web.json_response({"success": True})

# Admin login endpoint
async def api_login(request):
    try:
        data = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400)
    
    password = data.get("password")
    if password == ADMIN_PASSWORD:
        token = secrets.token_hex(16)
        dashboard_tokens.add(token)
        return web.json_response({"success": True, "token": token})
    return web.json_response({"error": "Invalid password"}, status=401)

# Stats endpoint
@auth_required
async def api_stats(request):
    uptime_sec = time.time() - start_time
    latency_ms = round(bot.latency * 1000, 2) if bot.latency else 0
    guilds_count = len(bot.guilds)
    total_members = sum(g.member_count for g in bot.guilds)
    active_voice = len(active_sessions)
    
    def run_db_stats():
        v_count = collection.count_documents({}) if collection is not None else 0
        m_count = money_col.count_documents({}) if money_col is not None else 0
        
        v_total_sec = 0
        if collection is not None:
            for doc in collection.find({}, {"total_seconds": 1}):
                v_total_sec += doc.get("total_seconds", 0)
                
        m_total_bal = 0
        if money_col is not None:
            for doc in money_col.find({}, {"balance": 1}):
                m_total_bal += doc.get("balance", 0)
        
        return v_count, m_count, v_total_sec, m_total_bal
        
    v_count, m_count, v_total_sec, m_total_bal = await asyncio.to_thread(run_db_stats)
    
    return web.json_response({
        "uptime": uptime_sec,
        "latency": latency_ms,
        "guilds_count": guilds_count,
        "total_members": total_members,
        "active_voice": active_voice,
        "db_connected": collection is not None,
        "voice_users_count": v_count,
        "economy_users_count": m_count,
        "total_voice_seconds": v_total_sec,
        "total_balance_circulation": m_total_bal
    })

# Users retrieval endpoint
@auth_required
async def api_users(request):
    search_query = request.query.get("search", "").strip().lower()
    
    def run_query():
        v_list = list(collection.find()) if collection is not None else []
        m_list = list(money_col.find()) if money_col is not None else []
        return v_list, m_list
        
    v_list, m_list = await asyncio.to_thread(run_query)
    
    merged = {}
    for item in v_list:
        uid = str(item.get("user_id")) if item.get("user_id") is not None else None
        if uid:
            merged[uid] = {
                "user_id": uid,
                "total_seconds": item.get("total_seconds", 0),
                "first_join": item.get("first_join", "Unknown"),
                "balance": 1000
            }
            
    for item in m_list:
        uid = str(item.get("user_id")) if item.get("user_id") is not None else None
        if uid:
            if uid not in merged:
                merged[uid] = {
                    "user_id": uid,
                    "total_seconds": 0,
                    "first_join": "Unknown",
                    "balance": 1000
                }
            merged[uid]["balance"] = item.get("balance", 1000)
            
    users_data = []
    for uid, u_info in merged.items():
        try:
            uid_int = int(uid)
            discord_user = bot.get_user(uid_int)
            if not discord_user:
                for guild in bot.guilds:
                    member = guild.get_member(uid_int)
                    if member:
                        discord_user = member
                        break
        except Exception:
            discord_user = None
            
        username = discord_user.name if discord_user else f"User {uid}"
        display_name = discord_user.display_name if discord_user else username
        avatar_url = str(discord_user.display_avatar.url) if discord_user else "https://cdn.discordapp.com/embed/avatars/0.png"
        
        if search_query:
            if (search_query not in uid.lower() and 
                search_query not in username.lower() and 
                search_query not in display_name.lower()):
                continue
                
        u_info["username"] = username
        u_info["display_name"] = display_name
        u_info["avatar_url"] = avatar_url
        users_data.append(u_info)
        
    users_data.sort(key=lambda x: x.get("balance", 0), reverse=True)
    return web.json_response({"users": users_data})

# User update endpoint
@auth_required
async def api_users_update(request):
    try:
        data = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400)
        
    user_id = data.get("user_id")
    field = data.get("field")
    value = data.get("value")
    
    if not user_id or field not in ("balance", "total_seconds") or value is None:
        return web.json_response({"error": "Missing or invalid fields"}, status=400)
        
    try:
        val_num = int(value)
    except ValueError:
        return web.json_response({"error": "Value must be an integer"}, status=400)
        
    if field == "balance":
        if money_col is None:
            return web.json_response({"error": "Database not connected"}, status=500)
        def run_money():
            try:
                money_col.delete_many({"user_id": int(user_id)})
            except Exception:
                pass
            money_col.update_one({"user_id": str(user_id)}, {"$set": {"balance": val_num}}, upsert=True)
        await asyncio.to_thread(run_money)
    else:
        if collection is None:
            return web.json_response({"error": "Database not connected"}, status=500)
        def run_voice():
            try:
                collection.delete_many({"user_id": int(user_id)})
            except Exception:
                pass
            collection.update_one({"user_id": str(user_id)}, {"$set": {"total_seconds": val_num}}, upsert=True)
        await asyncio.to_thread(run_voice)
        
    return web.json_response({"success": True})

# Configuration getters/setters
@auth_required
async def api_config_get(request):
    return web.json_response({
        "STAY_VOICE_CHANNEL_ID": str(STAY_VOICE_CHANNEL_ID),
        "WELCOME_CHANNEL_ID": str(WELCOME_CHANNEL_ID),
        "LEADERBOARD_CHANNEL_ID": str(LEADERBOARD_CHANNEL_ID),
        "CREATE_CHANNEL_ID": str(CREATE_CHANNEL_ID),
        "PARENT_CATEGORY_ID": str(PARENT_CATEGORY_ID),
        "AUTO_ROLE_ID": str(AUTO_ROLE_ID)
    })

@auth_required
async def api_config_set(request):
    try:
        data = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400)
        
    key = data.get("key")
    value = data.get("value")
    
    if key not in ("STAY_VOICE_CHANNEL_ID", "WELCOME_CHANNEL_ID", "LEADERBOARD_CHANNEL_ID", "CREATE_CHANNEL_ID", "PARENT_CATEGORY_ID", "AUTO_ROLE_ID"):
        return web.json_response({"error": "Invalid configuration key"}, status=400)
        
    try:
        save_setting(key, value)
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)
        
    return web.json_response({"success": True})

# Broadcast listing and dispatcher
@auth_required
async def api_channels_get(request):
    channels = []
    for guild in bot.guilds:
        for channel in guild.text_channels:
            channels.append({
                "guild_name": guild.name,
                "channel_name": channel.name,
                "channel_id": str(channel.id)
            })
    return web.json_response({"channels": channels})

@auth_required
async def api_broadcast(request):
    try:
        data = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400)
        
    channel_id_str = data.get("channel_id")
    message_text = data.get("message", "")
    embed_data = data.get("embed")
    
    if not channel_id_str:
        return web.json_response({"error": "Missing channel_id"}, status=400)
        
    try:
        channel_id = int(channel_id_str)
        channel = bot.get_channel(channel_id)
        if not channel:
            channel = await bot.fetch_channel(channel_id)
    except Exception as e:
        return web.json_response({"error": f"Channel not found: {e}"}, status=404)
        
    try:
        embed = None
        if embed_data and (embed_data.get("title") or embed_data.get("description")):
            color_val = 0x5865f2
            color_hex = embed_data.get("color", "").replace("#", "")
            if color_hex:
                try:
                    color_val = int(color_hex, 16)
                except ValueError:
                    pass
            
            embed = discord.Embed(
                title=embed_data.get("title"),
                description=embed_data.get("description"),
                color=color_val,
                timestamp=datetime.now()
            )
            
            if embed_data.get("thumbnail_url"):
                embed.set_thumbnail(url=embed_data.get("thumbnail_url"))
                
            if embed_data.get("footer_text"):
                embed.set_footer(text=embed_data.get("footer_text"), icon_url=bot.user.display_avatar.url if bot.user.display_avatar else None)
                
        if embed:
            await channel.send(content=message_text or None, embed=embed)
        else:
            await channel.send(content=message_text)
            
        return web.json_response({"success": True})
    except Exception as e:
        return web.json_response({"error": f"Failed to send message: {e}"}, status=500)

# Public Leaderboards endpoint
async def api_public_leaderboards(request):
    def run_query():
        v_list = list(collection.find().sort("total_seconds", -1).limit(50)) if collection is not None else []
        m_list = list(money_col.find().sort("balance", -1).limit(50)) if money_col is not None else []
        return v_list, m_list

    v_list, m_list = await asyncio.to_thread(run_query)
    
    uids = set()
    for item in v_list:
        if item.get("user_id"): uids.add(item["user_id"])
    for item in m_list:
        if item.get("user_id"): uids.add(item["user_id"])
        
    user_details = {}
    for uid in uids:
        try:
            uid_int = int(uid)
            discord_user = bot.get_user(uid_int)
            if not discord_user:
                for guild in bot.guilds:
                    member = guild.get_member(uid_int)
                    if member:
                        discord_user = member
                        break
        except Exception:
            discord_user = None
            
        username = discord_user.name if discord_user else f"User {uid}"
        display_name = discord_user.display_name if discord_user else username
        avatar_url = str(discord_user.display_avatar.url) if discord_user else "https://cdn.discordapp.com/embed/avatars/0.png"
        user_details[uid] = {
            "username": username,
            "display_name": display_name,
            "avatar_url": avatar_url
        }
        
    voice_leaderboard = []
    for item in v_list:
        uid = item.get("user_id")
        details = user_details.get(uid, {"username": f"User {uid}", "display_name": f"User {uid}", "avatar_url": "https://cdn.discordapp.com/embed/avatars/0.png"})
        voice_leaderboard.append({
            "user_id": uid,
            "total_seconds": item.get("total_seconds", 0),
            "first_join": item.get("first_join", "Unknown"),
            "username": details["username"],
            "display_name": details["display_name"],
            "avatar_url": details["avatar_url"]
        })
        
    economy_leaderboard = []
    for item in m_list:
        uid = item.get("user_id")
        details = user_details.get(uid, {"username": f"User {uid}", "display_name": f"User {uid}", "avatar_url": "https://cdn.discordapp.com/embed/avatars/0.png"})
        economy_leaderboard.append({
            "user_id": uid,
            "balance": item.get("balance", 1000),
            "username": details["username"],
            "display_name": details["display_name"],
            "avatar_url": details["avatar_url"]
        })
        
    return web.json_response({
        "voice": voice_leaderboard,
        "economy": economy_leaderboard
    })

# Public Search endpoint
async def api_public_search(request):
    query = request.query.get("q", "").strip().lower()
    if not query:
        return web.json_response({"results": []})
        
    matching_member_ids = set()
    if query.isdigit():
        matching_member_ids.add(query)
        
    for guild in bot.guilds:
        for member in guild.members:
            if (query in member.name.lower() or 
                (member.nick and query in member.nick.lower()) or 
                (member.global_name and query in member.global_name.lower()) or
                query == str(member.id)):
                matching_member_ids.add(str(member.id))
                if len(matching_member_ids) >= 15:
                    break
        if len(matching_member_ids) >= 15:
            break
            
    def run_db_query(uids_list):
        voice_records = {}
        if collection is not None:
            for r in collection.find({"user_id": {"$in": uids_list}}):
                voice_records[r["user_id"]] = r
                
        money_records = {}
        if money_col is not None:
            for r in money_col.find({"user_id": {"$in": uids_list}}):
                money_records[r["user_id"]] = r
                
        return voice_records, money_records
        
    uids_list = list(matching_member_ids)
    voice_records, money_records = await asyncio.to_thread(run_db_query, uids_list)
    
    results = []
    for uid in uids_list:
        v_rec = voice_records.get(uid, {})
        m_rec = money_records.get(uid, {})
        
        try:
            uid_int = int(uid)
            discord_user = bot.get_user(uid_int)
            if not discord_user:
                for guild in bot.guilds:
                    member = guild.get_member(uid_int)
                    if member:
                        discord_user = member
                        break
        except Exception:
            discord_user = None
            
        if not discord_user and not v_rec and not m_rec:
            continue
            
        username = discord_user.name if discord_user else f"User {uid}"
        display_name = discord_user.display_name if discord_user else username
        avatar_url = str(discord_user.display_avatar.url) if discord_user else "https://cdn.discordapp.com/embed/avatars/0.png"
        
        results.append({
            "user_id": uid,
            "username": username,
            "display_name": display_name,
            "avatar_url": avatar_url,
            "total_seconds": v_rec.get("total_seconds", 0),
            "first_join": v_rec.get("first_join", "Unknown"),
            "balance": m_rec.get("balance", 1000)
        })
        
    def get_ranks(uid, voice_sec, balance):
        v_rank = 0
        m_rank = 0
        if collection is not None and voice_sec > 0:
            v_rank = collection.count_documents({"total_seconds": {"$gt": voice_sec}}) + 1
        if money_col is not None:
            m_rank = money_col.count_documents({"balance": {"$gt": balance}}) + 1
        return v_rank, m_rank
        
    for r in results:
        v_rank, m_rank = await asyncio.to_thread(get_ranks, r["user_id"], r["total_seconds"], r["balance"])
        r["voice_rank"] = v_rank or "N/A"
        r["economy_rank"] = m_rank or "N/A"
        
    results.sort(key=lambda x: x.get("total_seconds", 0), reverse=True)
    return web.json_response({"results": results})

# Static file serving handlers
async def index_handler(request):
    return web.FileResponse(os.path.join(os.path.dirname(__file__), 'dashboard', 'index.html'))

async def style_handler(request):
    return web.FileResponse(os.path.join(os.path.dirname(__file__), 'dashboard', 'style.css'))

async def app_js_handler(request):
    return web.FileResponse(os.path.join(os.path.dirname(__file__), 'dashboard', 'app.js'))

@web.middleware
async def cors_middleware(request, handler):
    if request.method == "OPTIONS":
        response = web.Response(status=200)
    else:
        response = await handler(request)
    
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, PUT, DELETE'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
    return response

# Start aiohttp server with dashboard configurations
async def start_web_server():
    app = web.Application(middlewares=[cors_middleware])
    
    # API endpoints
    app.router.add_post('/api/login', api_login)
    app.router.add_get('/api/verify', api_verify)
    app.router.add_get('/api/public/leaderboards', api_public_leaderboards)
    app.router.add_get('/api/public/search', api_public_search)
    app.router.add_get('/api/stats', api_stats)
    app.router.add_get('/api/users', api_users)
    app.router.add_post('/api/users/update', api_users_update)
    app.router.add_get('/api/config', api_config_get)
    app.router.add_post('/api/config', api_config_set)
    app.router.add_get('/api/channels', api_channels_get)
    app.router.add_post('/api/broadcast', api_broadcast)
    
    # Static files routing
    app.router.add_get('/', index_handler)
    app.router.add_get('/style.css', style_handler)
    app.router.add_get('/app.js', app_js_handler)
    
    runner = web.AppRunner(app)
    await runner.setup()
    port = int(os.getenv('PORT', 8080))
    site = web.TCPSite(runner, '0.0.0.0', port)
    await site.start()
    print(f"✅ [WEB SERVER] Listening on port {port}")

# ════════════════════════════════════════════
# 🚪 4. PRIVATE ROOM — KNOCK / APPROVE VIEW
# ════════════════════════════════════════════
class OwnerView(discord.ui.View):
    def __init__(self, owner_id, target_member, voice_channel):
        super().__init__(timeout=180)
        self.owner_id      = owner_id
        self.target_member = target_member
        self.voice_channel = voice_channel

    @discord.ui.button(label="Accept ✅", style=discord.ButtonStyle.green)
    async def accept(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.owner_id:
            return await interaction.response.send_message("🚫 អ្នកមិនមែនជាម្ចាស់បន្ទប់ទេ!", ephemeral=True)

        await self.voice_channel.set_permissions(self.target_member, connect=True, view_channel=True)
        await interaction.response.send_message(
            f"✅ អនុញ្ញាត **{self.target_member.display_name}** ចូលបន្ទប់!", ephemeral=True
        )

        try:
            if self.target_member.voice:
                await self.target_member.move_to(self.voice_channel)
        except Exception:
            pass

        await interaction.message.delete()

        confirm = await self.voice_channel.send(f"✅ **{self.target_member.display_name}** បានចូលបន្ទប់។")
        await asyncio.sleep(5)
        try:
            await confirm.delete()
        except Exception:
            pass

    @discord.ui.button(label="Decline ❌", style=discord.ButtonStyle.red)
    async def decline(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.owner_id:
            return await interaction.response.send_message("🚫 អ្នកមិនមែនជាម្ចាស់បន្ទប់ទេ!", ephemeral=True)

        await interaction.message.delete()
        await interaction.response.send_message(
            f"❌ បានបដិសេធ **{self.target_member.display_name}**", ephemeral=True
        )

# ════════════════════════════════════════════
# 🎮 5. KLA KLOUK UI VIEWS
# ════════════════════════════════════════════
KLA_KLOUK = {"ខ្លា": "🐯", "ឃ្លោក": "🍐", "មាន់": "🐔", "ត្រី": "🐟", "ក្ដាម": "🦀", "បង្កង": "🦞"}

class PlayAgainView(discord.ui.View):
    def __init__(self, ctx, history):
        super().__init__(timeout=60)
        self.ctx, self.history = ctx, history

    @discord.ui.button(label="លេងម្ដងទៀត", style=discord.ButtonStyle.primary, emoji="🔄")
    async def play_again(self, interaction, button):
        for msg in self.history:
            try:
                await msg.delete()
            except:
                pass
        await self.ctx.invoke(bot.get_command('klaklouk'))

class MoneyView(discord.ui.View):
    def __init__(self, parent_view, user_id, choice_emoji):
        super().__init__(timeout=30)
        self.parent_view, self.user_id, self.choice_emoji = parent_view, user_id, choice_emoji

    async def process_bet(self, interaction, amount):
        if interaction.user.id != self.user_id:
            return
        current_bal = await get_balance(self.user_id)
        if current_bal < amount:
            return await interaction.response.send_message("❌ លុយមិនគ្រាន់ទេ!", ephemeral=True)

        await update_balance(self.user_id, -amount)
        self.parent_view.bets[self.user_id] = {
            'choice': self.choice_emoji,
            'amount': amount,
            'name': interaction.user.display_name
        }
        await interaction.response.edit_message(
            content=f"💰 ភ្នាល់លើ៖ {self.choice_emoji} | **${amount:,}** រួចរាល់!",
            view=None
        )

    # Row 0 — Small bets
    @discord.ui.button(label="$10",  style=discord.ButtonStyle.success, row=0)
    async def b1(self, i, b): await self.process_bet(i, 10)
    @discord.ui.button(label="$20",  style=discord.ButtonStyle.success, row=0)
    async def b2(self, i, b): await self.process_bet(i, 20)
    @discord.ui.button(label="$50",  style=discord.ButtonStyle.success, row=0)
    async def b3(self, i, b): await self.process_bet(i, 50)
    @discord.ui.button(label="$100", style=discord.ButtonStyle.success, row=0)
    async def b4(self, i, b): await self.process_bet(i, 100)
    @discord.ui.button(label="$200", style=discord.ButtonStyle.success, row=0)
    async def b5(self, i, b): await self.process_bet(i, 200)

    # Row 1 — Medium bets
    @discord.ui.button(label="$500",   style=discord.ButtonStyle.primary, row=1)
    async def b6(self, i, b): await self.process_bet(i, 500)
    @discord.ui.button(label="$1,000", style=discord.ButtonStyle.primary, row=1)
    async def b7(self, i, b): await self.process_bet(i, 1000)
    @discord.ui.button(label="$2,000", style=discord.ButtonStyle.primary, row=1)
    async def b8(self, i, b): await self.process_bet(i, 2000)
    @discord.ui.button(label="$3,000", style=discord.ButtonStyle.primary, row=1)
    async def b9(self, i, b): await self.process_bet(i, 3000)
    @discord.ui.button(label="$5,000", style=discord.ButtonStyle.primary, row=1)
    async def b10(self, i, b): await self.process_bet(i, 5000)

    # Row 2 — High bets
    @discord.ui.button(label="$10,000", style=discord.ButtonStyle.danger, row=2)
    async def b11(self, i, b): await self.process_bet(i, 10000)

class KlaKloukView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=20)
        self.bets = {}

    async def handle_choice(self, interaction, emoji):
        await interaction.response.send_message(
            f"✅ រើស៖ {emoji}\n💰 ចាក់ប៉ុន្មាន?",
            view=MoneyView(self, interaction.user.id, emoji),
            ephemeral=True
        )

    @discord.ui.button(label="ខ្លា",   emoji="🐯", row=0)
    async def kla(self,  i, b): await self.handle_choice(i, "🐯")
    @discord.ui.button(label="ឃ្លោក", emoji="🍐", row=0)
    async def klouk(self, i, b): await self.handle_choice(i, "🍐")
    @discord.ui.button(label="មាន់",   emoji="🐔", row=0)
    async def moin(self, i, b): await self.handle_choice(i, "🐔")
    @discord.ui.button(label="ត្រី",   emoji="🐟", row=1)
    async def trei(self, i, b): await self.handle_choice(i, "🐟")
    @discord.ui.button(label="ក្ដាម",  emoji="🦀", row=1)
    async def kdam(self, i, b): await self.handle_choice(i, "🦀")
    @discord.ui.button(label="បង្កង", emoji="🦞", row=1)
    async def bong(self, i, b): await self.handle_choice(i, "🦞")

# ════════════════════════════════════════════
# 🔴 6. EVENTS
# ════════════════════════════════════════════
@bot.event
async def on_ready():
    print(f'✅ Bot Status: ONLINE ({bot.user.name})')
    # Web server is now started concurrently at startup.
    print("✅ [WEB SERVER] Operational.")
    if not afk_income.is_running():
        afk_income.start()
    if not auto_update_leaderboard.is_running():
        auto_update_leaderboard.start()
    await force_join_stay_channel()
    print(f"🔑 [DASHBOARD] Web Admin Dashboard is running at http://localhost:{os.getenv('PORT', 8080)}")
    print(f"🔑 [DASHBOARD] Login password: {ADMIN_PASSWORD}")

@bot.event
async def on_member_join(member):
    """Welcome new member + give Auto Role."""
    # 🎭 Auto Role
    if AUTO_ROLE_ID != 0:
        role = member.guild.get_role(AUTO_ROLE_ID)
        if role:
            try:
                await member.add_roles(role)
                print(f"✅ [AUTO ROLE] Given '{role.name}' to {member.name}")
            except Exception as e:
                print(f"❌ [AUTO ROLE ERROR]: {e}")

    # 👋 Welcome Message
    channel = bot.get_channel(WELCOME_CHANNEL_ID)
    if not channel:
        return

    member_count = member.guild.member_count
    embed = discord.Embed(
        title="🎊 សមាជិកថ្មីបានចូលហើយ! 🎊",
        description=(
            f"សូស្តី {member.mention}! សូមស្វាគមន៍មកកាន់ **{member.guild.name}**!\n\n"
            f"☀️ វីតាយដែលជាអ្នកមកត្រូលរួមមានមូវវ័យព្យួរឈ្នះ!\n"
            f"📋 សូមអានច្បាប់ និងវីតាយដែលអ្នកយការផែកណែណពេលអ្នកព្យួរឈ្នះ!\n"
        ),
        color=0xf1c40f,
        timestamp=datetime.now()
    )
    embed.add_field(name="🔢 សមាជិកទី", value=str(member_count), inline=False)
    embed.set_thumbnail(url=member.display_avatar.url)
    embed.set_footer(
        text=f"Welcome to {member.guild.name}",
        icon_url=member.guild.icon.url if member.guild.icon else None
    )
    await channel.send(content=f"សូមស្វាគមន៍សមាជិកថ្មី! {member.mention}", embed=embed)

    # 💾 Save first_join date to MongoDB when user joins server
    if collection is not None:
        def run():
            collection.update_one(
                {"user_id": str(member.id)},
                {"$setOnInsert": {
                    "user_id": str(member.id),
                    "total_seconds": 0,
                    "first_join": datetime.now().strftime("%b %d, %Y")
                }},
                upsert=True
            )
        await asyncio.to_thread(run)

@bot.event
async def on_member_remove(member):
    """Send a goodbye message when a member leaves."""
    channel = bot.get_channel(WELCOME_CHANNEL_ID)
    if not channel:
        return

    embed = discord.Embed(
        title="👋 សមាជិកបានចាកចេញ...",
        description=(
            f"**{member.name}** បានចាកចេញពី **{member.guild.name}**។\n\n"
            f"សូមអរគុណដែលបានចូលរួមជាមួយពួកយើង! 🙏"
        ),
        color=0x95a5a6,
        timestamp=datetime.now()
    )
    embed.set_thumbnail(url=member.display_avatar.url)
    embed.add_field(name="👥 សមាជិកសល់", value=str(member.guild.member_count), inline=False)
    embed.set_footer(
        text=f"Temperature System • {member.guild.name}",
        icon_url=member.guild.icon.url if member.guild.icon else None
    )
    await channel.send(embed=embed)

@bot.event
async def on_voice_state_update(member, before, after):
    u_id = str(member.id)
    now  = time.time()

    # --- Part A: Bot Self-Correction ---
    if member.id == bot.user.id and after.channel is None:
        print("⚠️ Bot was disconnected. Rejoining...")
        await asyncio.sleep(3)
        await force_join_stay_channel()
        return

    # --- Part B: Voice Tracking ---
    joined   = before.channel is None and after.channel is not None
    left     = before.channel is not None and after.channel is None
    switched = (before.channel is not None and after.channel is not None
                and before.channel.id != after.channel.id)

    if joined:
        active_sessions[u_id] = now

    elif left:
        if u_id in active_sessions:
            duration = now - active_sessions.pop(u_id)
            await _save_voice_time(u_id, duration)
            # 🏆 Update rank role after saving time
            user_data = await asyncio.to_thread(collection.find_one, {"user_id": u_id}) if collection is not None else None
            if user_data:
                await update_rank_role(member, user_data.get('total_seconds', 0))

    elif switched:
        if u_id in active_sessions:
            duration = now - active_sessions[u_id]
            await _save_voice_time(u_id, duration)
        active_sessions[u_id] = now

    # --- Part C: Auto Create Private Room ---
    if after.channel and after.channel.id == CREATE_CHANNEL_ID:
        guild = member.guild
        overwrites = {
            # ✅ FIX: view_channel=True — user ដទៃ មើលឃើញ channel ប៉ុន្តែ connect មិនបាន
            guild.default_role: discord.PermissionOverwrite(
                connect=False,
                view_channel=True
            ),
            member: discord.PermissionOverwrite(
                connect=True, view_channel=True,
                manage_channels=True, manage_permissions=True, move_members=True
            ),
            guild.me: discord.PermissionOverwrite(
                connect=True, view_channel=True, manage_channels=True
            )
        }
        new_cat = await guild.create_category(
            name=f"⭐ {member.display_name}'s Space",
            overwrites=overwrites
        )
        new_ch = await guild.create_voice_channel(
            name=f"🔊 {member.display_name}-room",
            category=new_cat
        )
        room_data[new_ch.id] = {"owner": member.id, "category": new_cat.id}
        await member.move_to(new_ch)

        welcome = await new_ch.send(
            f"👋 សូមស្វាគមន៍ {member.mention}!\n"
            f"🔒 បន្ទប់ឯកជនត្រូវបានបង្កើតសម្រាប់អ្នក។\n"
            f"អ្នកដ៏ទៃមើលឃើញបន្ទប់នេះ ប៉ុន្តែត្រូវសុំការអនុញ្ញាតដើម្បីចូល។"
        )
        await asyncio.sleep(10)
        try:
            await welcome.delete()
        except Exception:
            pass

    # --- Part D: Knock System (stranger tries to join private room) ---
    if after.channel and after.channel.id in room_data:
        data = room_data[after.channel.id]
        if member.id != data["owner"]:
            perms = after.channel.overwrites_for(member)
            if perms.connect is not True:
                # Kick the stranger out immediately
                try:
                    await member.move_to(None)
                except Exception:
                    pass

                # Notify the room owner with Accept / Decline buttons
                voice_room = bot.get_channel(after.channel.id)
                if voice_room:
                    view = OwnerView(data["owner"], member, voice_room)
                    alert = await voice_room.send(
                        f"🚨 **{member.display_name}** កំពុងសុំចូលបន្ទប់របស់អ្នក!",
                        view=view
                    )

    # --- Part E: Cleanup when room is empty ---
    if before.channel and before.channel.id in room_data:
        if len(before.channel.members) == 0:
            data     = room_data[before.channel.id]
            voice_ch = bot.get_channel(before.channel.id)
            cat_ch   = bot.get_channel(data["category"])
            try:
                if voice_ch:
                    await voice_ch.delete()
                if cat_ch:
                    await cat_ch.delete()
            except Exception:
                pass
            room_data.pop(before.channel.id, None)

@bot.event
async def on_command_error(ctx, error):
    if isinstance(error, commands.CommandNotFound):
        embed = discord.Embed(
            title="❌ បញ្ជាមិនត្រឹមត្រូវ!",
            description=(
                f"មិនមានបញ្ជា `{ctx.invoked_with}` ក្នុងប្រព័ន្ធទេ។\n\n"
                f"💡 បញ្ជាដែលត្រឹមត្រូវ: `.top`, `.me`, `.stats`, `.klaklouk`, `.luyme`, `.topluy`, `.give`, `.quiz`"
            ),
            color=0xff0000
        )
        await ctx.send(embed=embed, delete_after=10)

# ════════════════════════════════════════════
# 🟣 7. TASKS
# ════════════════════════════════════════════
@tasks.loop(minutes=1)
async def afk_income():
    """Give $10 every minute to all online members."""
    if money_col is None:
        return
    db_tasks = []
    for guild in bot.guilds:
        for member in guild.members:
            if not member.bot and member.status != discord.Status.offline:
                db_tasks.append(update_balance(member.id, 100))
    if db_tasks:
        await asyncio.gather(*db_tasks)

@tasks.loop(hours=24)
async def auto_update_leaderboard():
    """Auto-refresh the leaderboard channel every 24 hours."""
    channel = bot.get_channel(LEADERBOARD_CHANNEL_ID)
    if channel:
        await channel.purge(limit=5)
        await channel.send(embed=await get_leaderboard_embed())

# ════════════════════════════════════════════
# 🎮 8. COMMANDS
# ════════════════════════════════════════════

# ── Voice Leaderboard ──────────────────────
@bot.command()
async def top(ctx):
    """View the Top 10 Active Users"""
    await ctx.send(embed=await get_leaderboard_embed())

@bot.command(aliases=['topme', 'profile'])
async def me(ctx):
    """View your personal voice stats"""
    u_id      = str(ctx.author.id)
    if collection is None:
        return
    user_data = await asyncio.to_thread(collection.find_one, {"user_id": u_id})

    if not user_data:
        embed = discord.Embed(
            description="⌛ មិនទាន់មានទិន្នន័យសកម្មភាពរបស់អ្នកនៅឡើយទេ។",
            color=0x2b2d31
        )
        await ctx.send(embed=embed)
        return

    total_seconds = user_data.get('total_seconds', 0)
    join_date     = user_data.get('first_join', "Unknown")

    def run():
        return list(collection.find().sort("total_seconds", -1))
    all_users = await asyncio.to_thread(run)
    rank_pos  = next((i + 1 for i, d in enumerate(all_users) if str(d['user_id']) == str(u_id)), None)
    rank_str  = f"🏆 #{rank_pos}" if rank_pos else "—"

    embed = discord.Embed(
        title="📊 Your Voice Rank Status",
        color=0x2b2d31,
        timestamp=datetime.now()
    )
    embed.add_field(name="User",       value=ctx.author.mention,         inline=True)
    embed.add_field(name="Your Rank",  value=rank_str,                   inline=True)
    embed.add_field(name="Total Time", value=format_time(total_seconds), inline=True)
    embed.add_field(name="​", value=f"Joined: {join_date}", inline=False)
    embed.set_thumbnail(url=ctx.author.display_avatar.url)
    embed.set_footer(
        text=f"Welcome to {ctx.guild.name}",
        icon_url=ctx.guild.icon.url if ctx.guild.icon else None
    )
    await ctx.send(embed=embed)

@bot.command()
async def stats(ctx):
    """View overall server voice statistics"""
    if collection is None:
        await ctx.send("❌ Database មិនអាចភ្ជាប់បានទេ។")
        return

    def run():
        total_users = collection.count_documents({})
        total_data  = list(collection.find())
        top3        = list(collection.find().sort("total_seconds", -1).limit(3))
        return total_users, total_data, top3

    total_users, total_data, top3 = await asyncio.to_thread(run)
    total_seconds = sum(d.get('total_seconds', 0) for d in total_data)
    active_now    = len(active_sessions)

    embed = discord.Embed(
        title="📊 ស្ថិតិ Server — Temperature",
        color=0x3498db,
        timestamp=datetime.now()
    )
    embed.add_field(name="👥 សមាជិកសរុប",          value=f"`{ctx.guild.member_count}`",    inline=True)
    embed.add_field(name="🎙️ នៅក្នុង Voice ឥឡូវ", value=f"`{active_now} នាក់`",            inline=True)
    embed.add_field(name="📋 អ្នកមានទិន្នន័យ",     value=f"`{total_users} នាក់`",            inline=True)
    embed.add_field(name="⏱️ ម៉ោង Voice សរុប",     value=f"`{format_time(total_seconds)}`", inline=True)

    top3      = list(collection.find().sort("total_seconds", -1).limit(3))
    top3_text = ""
    medals    = ["🥇", "🥈", "🥉"]
    for i, d in enumerate(top3):
        try:
            u    = bot.get_user(int(d['user_id'])) or await bot.fetch_user(int(d['user_id']))
            name = u.name if u else f"ID:{d['user_id']}"
        except Exception:
            name = f"ID:{d['user_id']}"
        top3_text += f"{medals[i]} **{name}** — `{format_time(d['total_seconds'])}`\n"

    if top3_text:
        embed.add_field(name="🏆 Top 3", value=top3_text, inline=False)

    embed.set_footer(text="Temperature System", icon_url=bot.user.display_avatar.url)
    embed.set_thumbnail(url=ctx.guild.icon.url if ctx.guild.icon else discord.Embed.Empty)
    await ctx.send(embed=embed)

# ── Kla Klouk Game ─────────────────────────
@bot.command(name="klaklouk")
async def klaklouk(ctx):
    history = []
    view    = KlaKloukView()
    msg     = await ctx.send(
        embed=discord.Embed(title="🎲 វង់ខ្លាឃ្លោក បើកភ្នាល់!", color=0xe74c3c),
        view=view
    )
    history.append(msg)
    await asyncio.sleep(20)
    await msg.edit(view=None)

    shake = await ctx.send("🥁 **កំពុងអង្រួន...**")
    history.append(shake)
    await asyncio.sleep(3)

    res     = [random.choice(list(KLA_KLOUK.values())) for _ in range(3)]
    results = []
    for uid, data in view.bets.items():
        count = res.count(data['choice'])
        if count > 0:
            await update_balance(uid, data['amount'] + (data['amount'] * count))
            results.append(f"✅ **{data['name']}** ឈ្នះ `${data['amount']*count:,}`")
        else:
            results.append(f"💸 **{data['name']}** ចាញ់ `${data['amount']:,}`")

    embed = discord.Embed(
        title="🎲 លទ្ធផល៖ " + " | ".join(res),
        description="\n".join(results) or "គ្មានអ្នកភ្នាល់",
        color=0x2ecc71
    )
    final = await shake.edit(content=None, embed=embed)
    await asyncio.sleep(2)
    await final.edit(view=PlayAgainView(ctx, history))

@bot.command()
async def luyme(ctx):
    """Check your Kla Klouk balance and rank"""
    user_id = ctx.author.id
    balance = await get_balance(user_id)

    def run():
        return list(money_col.find().sort("balance", -1)) if money_col is not None else []
    all_users = await asyncio.to_thread(run)
    rank      = next((i for i, u in enumerate(all_users, 1) if str(u['user_id']) == str(user_id)), "N/A")

    embed = discord.Embed(color=0x5865F2)
    embed.set_author(name="📊 Balance & Rank Status", icon_url=ctx.author.display_avatar.url)
    embed.add_field(name="User",      value=ctx.author.mention, inline=True)
    embed.add_field(name="Your Rank", value=f"🏆 #{rank}",      inline=True)
    embed.add_field(name="Money",     value=f"💰 `${balance:,}`", inline=True)
    embed.set_thumbnail(url=ctx.author.display_avatar.url)
    await ctx.send(embed=embed)

@bot.command()
async def topluy(ctx):
    """View the Top 10 richest users"""
    if money_col is None:
        return
    def run():
        return list(money_col.find().sort("balance", -1).limit(10))
    top = await asyncio.to_thread(run)
    leaderboard = ""
    for i, user in enumerate(top, 1):
        try:
            uid_int = int(user['user_id'])
            u = bot.get_user(uid_int) or await bot.fetch_user(uid_int)
        except Exception:
            u = None
        name = u.display_name if u else f"User ID: {user['user_id']}"
        leaderboard += f"**{i}. {name}** — `${user['balance']:,}`\n"
    await ctx.send(embed=discord.Embed(
        title="🏆 Top 10 អ្នកមានបំផុត",
        description=leaderboard or "គ្មានទិន្នន័យ",
        color=0xf1c40f
    ))

# ── Give Money (Admin Only) ────────────────
@bot.command()
@commands.has_permissions(administrator=True)
async def give(ctx, member: discord.Member, amount: int):
    """Admin: Give money to a user — .give @user amount"""
    if amount <= 0:
        embed = discord.Embed(
            title="❌ បរិមាណមិនត្រឹមត្រូវ!",
            description="សូមដាក់ចំនួនលុយច្រើនជាង 0។",
            color=0xff0000
        )
        return await ctx.send(embed=embed, delete_after=10)

    new_bal = await update_balance(member.id, amount)

    embed = discord.Embed(
        title="💸 ផ្ទេរប្រាក់បានជោគជ័យ!",
        color=0x2ecc71,
        timestamp=datetime.now()
    )
    embed.add_field(name="👤 អ្នកទទួល",    value=member.mention,       inline=True)
    embed.add_field(name="💰 ទទួលបាន",     value=f"`${amount:,}`",     inline=True)
    embed.add_field(name="🏦 សមតុល្យថ្មី", value=f"`${new_bal:,}`",    inline=True)
    embed.set_footer(
        text=f"ផ្ទេរដោយ {ctx.author.display_name}",
        icon_url=ctx.author.display_avatar.url
    )
    embed.set_thumbnail(url=member.display_avatar.url)
    await ctx.send(embed=embed)

    # Notify the recipient via DM
    try:
        dm_embed = discord.Embed(
            title="💰 អ្នកទទួលបានលុយ!",
            description=(
                f"**{ctx.author.display_name}** បានផ្ទេរ **${amount:,}** មកអ្នក!\n"
                f"🏦 សមតុល្យបច្ចុប្បន្ន: `${new_bal:,}`"
            ),
            color=0x2ecc71,
            timestamp=datetime.now()
        )
        await member.send(embed=dm_embed)
    except discord.Forbidden:
        pass  # User has DMs disabled

@give.error
async def give_error(ctx, error):
    if isinstance(error, commands.MissingPermissions):
        embed = discord.Embed(
            title="🚫 គ្មានសិទ្ធិ!",
            description="តែ **Admin** ប៉ុណ្ណោះអាចប្រើបញ្ជានេះបាន។",
            color=0xff0000
        )
        await ctx.send(embed=embed, delete_after=10)
    elif isinstance(error, commands.MissingRequiredArgument):
        embed = discord.Embed(
            title="❌ របៀបប្រើ",
            description="**`.give @user amount`**\nឧទាហរណ៍: `.give @John 5000`",
            color=0xff0000
        )
        await ctx.send(embed=embed, delete_after=10)
    elif isinstance(error, commands.BadArgument):
        embed = discord.Embed(
            title="❌ របៀបប្រើ",
            description="**`.give @user amount`**\nឧទាហរណ៍: `.give @John 5000`",
            color=0xff0000
        )
        await ctx.send(embed=embed, delete_after=10)

# ── Ban User (Admin Only) ──────────────────
@bot.command()
@commands.has_permissions(ban_members=True)
async def ban(ctx, member: discord.Member, *, reason: str = "គ្មានមូលហេតុបានផ្ដល់"):
    """Admin: Ban a user — .ban @user [reason]"""
    if member == ctx.author:
        return await ctx.send(
            embed=discord.Embed(description="❌ អ្នកមិនអាច Ban ខ្លួនឯងបានទេ!", color=0xff0000),
            delete_after=10
        )
    if member.top_role >= ctx.author.top_role:
        return await ctx.send(
            embed=discord.Embed(description="❌ អ្នកមិនអាច Ban អ្នកដែលមានតួនាទីស្មើ ឬខ្ពស់ជាងអ្នកបានទេ!", color=0xff0000),
            delete_after=10
        )

    # DM the banned user before banning
    try:
        dm_embed = discord.Embed(
            title="🔨 អ្នកត្រូវបាន Ban!",
            description=(
                f"អ្នកត្រូវបាន Ban ពី **{ctx.guild.name}**\n"
                f"📋 មូលហេតុ: `{reason}`\n"
                f"👮 Ban ដោយ: {ctx.author.display_name}"
            ),
            color=0xff0000,
            timestamp=datetime.now()
        )
        await member.send(embed=dm_embed)
    except discord.Forbidden:
        pass

    await member.ban(reason=reason)

    embed = discord.Embed(
        title="🔨 Ban បានជោគជ័យ!",
        color=0xff0000,
        timestamp=datetime.now()
    )
    embed.add_field(name="👤 អ្នកប្រើប្រាស់", value=member.mention,          inline=True)
    embed.add_field(name="👮 Ban ដោយ",         value=ctx.author.mention,     inline=True)
    embed.add_field(name="📋 មូលហេតុ",         value=f"`{reason}`",          inline=False)
    embed.set_thumbnail(url=member.display_avatar.url)
    embed.set_footer(text=f"ID: {member.id}", icon_url=bot.user.display_avatar.url)
    await ctx.send(embed=embed)

@ban.error
async def ban_error(ctx, error):
    if isinstance(error, commands.MissingPermissions):
        await ctx.send(
            embed=discord.Embed(description="🚫 តែ **Admin** ប៉ុណ្ណោះអាចប្រើបញ្ជានេះបាន។", color=0xff0000),
            delete_after=10
        )
    elif isinstance(error, commands.BadArgument):
        await ctx.send(
            embed=discord.Embed(description="❌ **`.ban @user [reason]`**\nឧទាហរណ៍: `.ban @John spam`", color=0xff0000),
            delete_after=10
        )

# ════════════════════════════════════════════
# ── Khmer TTS helper ────────────────────────
async def download_tts(text: str, filename: str):
    import urllib.parse
    import aiohttp
    encoded_text = urllib.parse.quote(text)
    url = f"https://translate.google.com/translate_tts?ie=UTF-8&tl=km&client=tw-ob&q={encoded_text}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=headers) as response:
            if response.status == 200:
                with open(filename, 'wb') as f:
                    f.write(await response.read())
                return True
    return False

# ── Khmer Quiz Game ─────────────────────────
class QuizPlayAgainView(discord.ui.View):
    def __init__(self, ctx, history):
        super().__init__(timeout=60)
        self.ctx, self.history = ctx, history

    @discord.ui.button(label="លេងម្ដងទៀត", style=discord.ButtonStyle.primary, emoji="🔄")
    async def play_again(self, interaction: discord.Interaction, button: discord.ui.Button):
        for msg in self.history:
            try:
                await msg.delete()
            except Exception:
                pass
        await self.ctx.invoke(bot.get_command('quiz'))

class QuizView(discord.ui.View):
    def __init__(self, ctx, correct_answer, options, history):
        super().__init__(timeout=15.0) # ទុកពេល ១៥ វិនាទីសម្រាប់ឆ្លើយ
        self.ctx = ctx
        self.correct_answer = correct_answer
        self.history = history
        self.message = None
        self.answers = {} # សម្រាប់ផ្ទុកចម្លើយ៖ user_id -> (username, is_correct, chosen_option)
        
        # បង្កើតប៊ូតុងចំនួន ៣ តាមជម្រើសចម្លើយ
        labels = ["ក", "ខ", "គ"]
        for i, option in enumerate(options):
            is_correct = (option == correct_answer)
            button = discord.ui.Button(
                label=f"{labels[i]}. {option}", 
                style=discord.ButtonStyle.blurple,
                custom_id=f"correct" if is_correct else f"wrong_{i}"
            )
            button.callback = self.button_callback
            self.add_item(button)

    async def button_callback(self, interaction: discord.Interaction):
        user_id = interaction.user.id
        
        # ១. ពិនិត្យមើលថាតើអ្នកប្រើប្រាស់នេះធ្លាប់បានឆ្លើយរួចហើយឬនៅ
        if user_id in self.answers:
            await interaction.response.send_message("❌ អ្នកបានឆ្លើយសំណួរនេះរួចរាល់ហើយ!", ephemeral=True)
            return

        # ២. កំណត់ប៊ូតុងដែលបានចុច និងចម្លើយត្រូវ/ខុស
        clicked_custom_id = interaction.data["custom_id"]
        is_correct = (clicked_custom_id == "correct")

        # ស្វែងរកជម្រើសដែលបានជ្រើសរើស
        chosen_option = ""
        for item in self.children:
            if isinstance(item, discord.ui.Button) and item.custom_id == clicked_custom_id:
                chosen_option = item.label.split(". ", 1)[-1]
                break

        # ៣. កត់ត្រាទុកចម្លើយរបស់អ្នកលេង
        self.answers[user_id] = (interaction.user.display_name, is_correct, chosen_option)

        # ៤. ផ្ញើសារឆ្លើយតបជាលក្ខណៈឯកជន (Ephemeral)
        if is_correct:
            await interaction.response.send_message(
                content=f"🎉 ល្អណាស់ **{interaction.user.display_name}**! អ្នកឆ្លើយបានត្រឹមត្រូវហើយ! 🎯",
                ephemeral=True
            )
        else:
            await interaction.response.send_message(
                content=f"❌ ខុសហើយ **{interaction.user.display_name}**! ចម្លើយត្រឹមត្រូវគឺ៖ **{self.correct_answer}**",
                ephemeral=True
            )

    async def on_timeout(self):
        if self.message:
            # បិទប៊ូតុងទាំងអស់ និងប្ដូរពណ៌ចម្លើយត្រឹមត្រូវជាពណ៌បៃតង
            for item in self.children:
                if isinstance(item, discord.ui.Button):
                    item.disabled = True
                    if item.custom_id == "correct":
                        item.style = discord.ButtonStyle.success
                    else:
                        item.style = discord.ButtonStyle.secondary

            # បូកសរុបលទ្ធផលអ្នកលេង
            correct_names = []
            incorrect_names = []
            for uid, (name, is_correct, option) in self.answers.items():
                if is_correct:
                    correct_names.append(f"**{name}**")
                else:
                    incorrect_names.append(f"**{name}**")

            summary_text = f"\n\n✨ **លទ្ធផល**:\n"
            summary_text += f"🎯 ចម្លើយត្រឹមត្រូវគឺ៖ **{self.correct_answer}**\n\n"
            
            if correct_names:
                summary_text += f"✅ **អ្នកឆ្លើយត្រូវ** ({len(correct_names)} នាក់)៖ {', '.join(correct_names)}\n"
            else:
                summary_text += f"✅ **អ្នកឆ្លើយត្រូវ**៖ គ្មាន\n"
                
            if incorrect_names:
                summary_text += f"❌ **អ្នកឆ្លើយខុស** ({len(incorrect_names)} នាក់)៖ {', '.join(incorrect_names)}\n"

            try:
                embed = self.message.embeds[0]
                embed.description = embed.description.replace(
                    "សូមចុចប៊ូតុងខាងក្រោមដើម្បីឆ្លើយ (មានពេល ១៥វិនាទី)៖", 
                    "⌛ បិទការឆ្លើយសំណួរ!"
                )
                embed.description += summary_text
                
                # ប្ដូរពណ៌ Embed តាមលទ្ធផល
                if correct_names:
                    embed.color = discord.Color.green()
                else:
                    embed.color = discord.Color.red()

                await self.message.edit(embed=embed, view=QuizPlayAgainView(self.ctx, self.history))
            except Exception as e:
                print(f"Error in QuizView on_timeout: {e}")
                
            self.stop()

@bot.command(name="quiz")
async def quiz(ctx):
    history = []
    # ចាប់យកសំណួរចៃដន្យមួយពីក្នុង List
    quiz_data = random.choice(KHMER_QUIZ)
    question = quiz_data["question"]
    options = quiz_data["options"]
    correct_answer = quiz_data["correct_answer"]

    # បង្កើតផ្ចាំ Embed ឲ្យមើលទៅស្អាតក្នុង Discord
    embed = discord.Embed(
        title="🧠 សំណួរពាក្យបណ្ដៅខ្មែរ",
        description=f"**{question}**\n\nសូមចុចប៊ូតុងខាងក្រោមដើម្បីឆ្លើយ (មានពេល ១៥វិនាទី)៖",
        color=discord.Color.gold()
    )
    embed.set_footer(text="ហ្គេមបង្កើតឡើងដោយជំនួយការ AI")

    view = QuizView(ctx, correct_answer, options, history)
    message = await ctx.send(embed=embed, view=view)
    history.append(message)
    view.message = message

    # លេងសំឡេងសំណួរ និងជម្រើសក្នុង Voice Channel
    text_to_speak = f"{question} ជម្រើស កគឺ {options[0]}។ ខគឺ {options[1]}។ គគឺ {options[2]}។"

    async def play_voice_task():
        vc = discord.utils.get(bot.voice_clients, guild=ctx.guild)
        if vc and vc.is_connected():
            filename = f"quiz_{message.id}.mp3"
            try:
                success = await download_tts(text_to_speak, filename)
                if success and os.path.exists(filename):
                    if vc.is_playing():
                        vc.stop()
                    vc.play(discord.FFmpegPCMAudio(filename), after=lambda e: os.remove(filename) if os.path.exists(filename) else None)
            except Exception as e:
                print(f"Error in play_voice_task: {e}")
                if os.path.exists(filename):
                    try:
                        os.remove(filename)
                    except:
                        pass

    bot.loop.create_task(play_voice_task())

# ════════════════════════════════════════════
async def main():
    # Start the web server first so that Render's health checks pass immediately
    await start_web_server()
    
    # Start the bot
    try:
        async with bot:
            await bot.start(TOKEN)
    except Exception as e:
        print(f"❌ [BOT STARTUP ERROR]: {e}")
        # Keep the event loop running so the web server stays active
        while True:
            await asyncio.sleep(3600)

if __name__ == '__main__':
    asyncio.run(main())