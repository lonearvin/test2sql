"""Text-to-SQL 集成测试脚本"""
import requests
import json
import time
import sys

BASE = "http://localhost:8000"
PASS = 0
FAIL = 0
TOKEN = ""
DS_ID = ""
TABLE_DESC_ID = ""
FIELD_DESC_ID = ""
QUERY_ID = ""

def test(name, result, details=""):
    global PASS, FAIL
    status = "✅ PASS" if result else "❌ FAIL"
    print(f"  {status} | {name}")
    if not result and details:
        print(f"         {details}")
    if result: PASS += 1
    else: FAIL += 1
    return result

print("=" * 70)
print("Text-to-SQL 集成测试")
print("=" * 70)

# ==================== 1. 健康检查 ====================
print("\n【1】健康检查")
resp = requests.get(f"{BASE}/health")
test("GET /health 返回200", resp.status_code == 200)
test("status=healthy", resp.json().get("status") == "healthy")

# ==================== 2. 认证模块 ====================
print("\n【2】认证模块 (auth)")

# 2.1 注册
resp = requests.post(f"{BASE}/api/v1/auth/register", json={
    "username": "testuser",
    "email": "testuser@example.com",
    "password": "test123456",
    "full_name": "Test User"
})
test("POST /register 注册成功", resp.status_code == 200, resp.text)

# 2.2 重复注册
resp = requests.post(f"{BASE}/api/v1/auth/register", json={
    "username": "testuser",
    "email": "testuser2@example.com",
    "password": "test123456"
})
test("POST /register 重复用户名拒绝", resp.status_code == 400, resp.text)

# 2.3 登录
resp = requests.post(f"{BASE}/api/v1/auth/login", data={
    "username": "testuser",
    "password": "test123456"
})
login_ok = resp.status_code == 200
if login_ok:
    TOKEN = resp.json()["access_token"]
test("POST /login 登录成功", login_ok, resp.text)
if login_ok:
    test("返回 access_token", len(TOKEN) > 0)
    test("返回 token_type=bearer", resp.json().get("token_type") == "bearer")

# 2.4 错误密码
resp = requests.post(f"{BASE}/api/v1/auth/login", data={
    "username": "testuser", "password": "wrongpassword"
})
test("POST /login 错误密码拒绝", resp.status_code == 401, resp.text)

# 2.5 /me
headers = {"Authorization": f"Bearer {TOKEN}"}
resp = requests.get(f"{BASE}/api/v1/auth/me", headers=headers)
test("GET /me 获取当前用户", resp.status_code == 200)
test("  username=testuser", resp.json().get("username") == "testuser")

# 2.6 未认证访问
resp = requests.get(f"{BASE}/api/v1/auth/me")
test("GET /me 无Token拒绝", resp.status_code == 401)

# ==================== 3. 数据源管理 ====================
print("\n【3】数据源管理 (data-sources)")

# 3.1 创建数据源
resp = requests.post(f"{BASE}/api/v1/data-sources/", json={
    "name": "测试MySQL",
    "type": "mysql",
    "host": "localhost",
    "port": 3306,
    "database": "text2sql_demo",
    "username": "text2sql",
    "password": "text2sql123",
    "description": "用于测试的MySQL数据源"
}, headers=headers)
ds_ok = resp.status_code == 200
if ds_ok:
    DS_ID = resp.json()["id"]
test("POST / 创建数据源", ds_ok, resp.text)

# 3.2 创建失败（错误连接）
resp = requests.post(f"{BASE}/api/v1/data-sources/", json={
    "name": "错误连接", "type": "mysql", "host": "1.2.3.4",
    "port": 3306, "database": "x", "username": "x", "password": "x"
}, headers=headers)
test("POST / 错误连接拒绝", resp.status_code == 400, resp.text)

# 3.3 获取列表
resp = requests.get(f"{BASE}/api/v1/data-sources/", headers=headers)
test("GET / 数据源列表", resp.status_code == 200 and len(resp.json()) >= 1)

# 3.4 获取详情
resp = requests.get(f"{BASE}/api/v1/data-sources/{DS_ID}", headers=headers)
test(f"GET /{DS_ID[:8]} 数据源详情", resp.status_code == 200)

# 3.5 浏览所有表
resp = requests.get(f"{BASE}/api/v1/data-sources/{DS_ID}/all-tables", headers=headers)
all_tables_ok = resp.status_code == 200
test(f"GET /{DS_ID[:8]}/all-tables 浏览表列表", all_tables_ok, resp.text)
if all_tables_ok:
    tables = resp.json().get("tables", [])
    test(f"  返回 {len(tables)} 张表", len(tables) > 0)
    print(f"  表列表: {tables}")

# 3.6 选择数据表
resp = requests.post(f"{BASE}/api/v1/data-sources/{DS_ID}/tables",
    json=["users", "products", "orders", "order_items", "categories"],
    headers=headers)
test(f"POST /{DS_ID[:8]}/tables 选择5张表", resp.status_code == 200, resp.text)

# 3.7 查看已选表
resp = requests.get(f"{BASE}/api/v1/data-sources/{DS_ID}/selected-tables", headers=headers)
test("GET /selected-tables 查看已选表", resp.status_code == 200 and len(resp.json()) == 5)

# 3.8 查看表结构
resp = requests.get(f"{BASE}/api/v1/data-sources/{DS_ID}/tables", headers=headers)
test(f"GET /{DS_ID[:8]}/tables 获取表结构", resp.status_code == 200, resp.text)

# ==================== 4. 语义层 API ====================
print("\n【4】语义层 API (semantic)")

# 4.1 创建表描述
resp = requests.post(f"{BASE}/api/v1/data-sources/{DS_ID}/semantic/tables", json={
    "table_name": "orders",
    "description": "订单主表，记录每笔订单的完整信息"
}, headers=headers)
td_ok = resp.status_code == 200
if td_ok:
    TABLE_DESC_ID = resp.json()["id"]
test("POST /semantic/tables 创建表描述", td_ok, resp.text)

# 4.2 获取表描述列表
resp = requests.get(f"{BASE}/api/v1/data-sources/{DS_ID}/semantic/tables", headers=headers)
test("GET /semantic/tables 表描述列表", resp.status_code == 200 and len(resp.json()) >= 1)

# 4.3 创建字段描述
resp = requests.post(f"{BASE}/api/v1/data-sources/{DS_ID}/semantic/fields", json={
    "table_name": "orders",
    "field_name": "status",
    "description": "订单状态: pending(待支付)/completed(已完成)/cancelled(已取消)"
}, headers=headers)
fd_ok = resp.status_code == 200
if fd_ok:
    FIELD_DESC_ID = resp.json()["id"]
test("POST /semantic/fields 创建字段描述", fd_ok, resp.text)

# 4.4 创建第二个字段描述
resp = requests.post(f"{BASE}/api/v1/data-sources/{DS_ID}/semantic/fields", json={
    "table_name": "orders",
    "field_name": "total_amount",
    "description": "订单总金额（含税）"
}, headers=headers)
test("POST /semantic/fields 创建第二个字段描述", resp.status_code == 200, resp.text)

# 4.5 获取字段描述
resp = requests.get(f"{BASE}/api/v1/data-sources/{DS_ID}/semantic/fields",
    params={"table_name": "orders"}, headers=headers)
test("GET /semantic/fields 字段描述列表", resp.status_code == 200 and len(resp.json()) >= 2)

# 4.6 更新字段描述
if FIELD_DESC_ID:
    resp = requests.put(f"{BASE}/api/v1/data-sources/{DS_ID}/semantic/fields/{FIELD_DESC_ID}",
        json={"description": "订单状态(更新)已付/已完成/已取消"}, headers=headers)
    test(f"PUT /semantic/fields/{FIELD_DESC_ID[:8]} 更新", resp.status_code == 200, resp.text)

# 4.7 批量导入语义
resp = requests.post(f"{BASE}/api/v1/data-sources/{DS_ID}/semantic/import", json={
    "items": [{
        "table_name": "products",
        "table_description": "产品信息表",
        "fields": [
            {"table_name": "products", "field_name": "price", "description": "产品单价"},
            {"table_name": "products", "field_name": "stock", "description": "库存数量"}
        ]
    }]
}, headers=headers)
test("POST /semantic/import 批量导入", resp.status_code == 200, resp.text)

# 4.8 导出语义
resp = requests.get(f"{BASE}/api/v1/data-sources/{DS_ID}/semantic/export", headers=headers)
export_ok = resp.status_code == 200
test("GET /semantic/export 导出语义", export_ok, resp.text)
if export_ok:
    export_data = resp.json()
    test(f"  导出 {len(export_data)} 张表的描述", len(export_data) >= 2)

# ==================== 5. 核心 Text-to-SQL 查询 ====================
print("\n【5】核心查询 (text-to-sql/query)")

resp = requests.post(f"{BASE}/api/v1/text-to-sql/query", json={
    "data_source_id": DS_ID,
    "question": "总共有多少个用户？",
    "conversation_history": []
}, headers=headers)
query_ok = resp.status_code == 200
if query_ok:
    QUERY_ID = resp.json().get("id")
    query_data = resp.json()
test("POST /query 基本查询", query_ok, resp.text)
if query_ok:
    test(f"  返回 status=success", query_data.get("status") == "success")
    test(f"  返回 sql 非空", bool(query_data.get("sql")))
    test(f"  返回 results", isinstance(query_data.get("results"), list))

# 5.2 聚合查询
resp = requests.post(f"{BASE}/api/v1/text-to-sql/query", json={
    "data_source_id": DS_ID,
    "question": "有多少个产品，平均价格是多少？",
    "conversation_history": []
}, headers=headers)
test("POST /query 聚合查询", resp.status_code == 200 and resp.json().get("status") == "success", resp.text)

# 5.3 多轮对话
resp = requests.post(f"{BASE}/api/v1/text-to-sql/query", json={
    "data_source_id": DS_ID,
    "question": "查询iPhone相关产品",
    "conversation_history": []
}, headers=headers)
hist = resp.json().get("conversation_history", [])
test("POST /query 多轮对话-第一轮", resp.status_code == 200 and len(hist) >= 2)

if len(hist) >= 2:
    resp = requests.post(f"{BASE}/api/v1/text-to-sql/query", json={
        "data_source_id": DS_ID,
        "question": "其中价格最贵的是哪个？",
        "conversation_history": hist
    }, headers=headers)
    test("POST /query 多轮对话-第二轮", resp.status_code == 200, resp.text)

# ==================== 6. 查询历史 ====================
print("\n【6】查询历史 (history)")

resp = requests.get(f"{BASE}/api/v1/text-to-sql/history", headers=headers)
test("GET /history 历史列表", resp.status_code == 200 and len(resp.json()) > 0)

# 历史详情
if QUERY_ID:
    resp = requests.get(f"{BASE}/api/v1/text-to-sql/history/{QUERY_ID}", headers=headers)
    test("GET /history/{id} 历史详情", resp.status_code == 200)

# 相似查询
resp = requests.get(f"{BASE}/api/v1/text-to-sql/similar",
    params={"question": "有多少用户", "data_source_id": DS_ID}, headers=headers)
test("GET /similar 相似查询", resp.status_code == 200)

# ==================== 7. 安全机制 ====================
print("\n【7】安全机制测试")

# 7.1 未认证访问query
resp = requests.post(f"{BASE}/api/v1/text-to-sql/query", json={
    "data_source_id": DS_ID, "question": "test", "conversation_history": []
})
test("未认证 POST /query 拒绝", resp.status_code == 401)

# 7.2 访问他人数据源（注册第二个用户）
resp = requests.post(f"{BASE}/api/v1/auth/register", json={
    "username": "user2", "email": "user2@example.com", "password": "test123456"
})
if resp.status_code == 200:
    resp2 = requests.post(f"{BASE}/api/v1/auth/login", data={
        "username": "user2", "password": "test123456"
    })
    token2 = resp2.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}
    resp3 = requests.post(f"{BASE}/api/v1/text-to-sql/query", json={
        "data_source_id": DS_ID, "question": "有多少用户？", "conversation_history": []
    }, headers=headers2)
    test("用户隔离: 他人数据源拒绝", resp3.status_code == 400, resp3.text)

# 7.3 删除查询历史
if QUERY_ID:
    resp = requests.delete(f"{BASE}/api/v1/text-to-sql/history/{QUERY_ID}", headers=headers)
    test(f"DELETE /history/{QUERY_ID[:8]} 删除成功", resp.status_code == 200)

# ==================== 8. 数据源更新与删除 ====================
print("\n【8】数据源更新与删除")

# 更新数据源
resp = requests.put(f"{BASE}/api/v1/data-sources/{DS_ID}", json={
    "name": "测试MySQL(已更新)", "description": "更新后的描述"
}, headers=headers)
test("PUT /data-sources/{id} 更新", resp.status_code == 200)

# 删除字段描述
if FIELD_DESC_ID:
    resp = requests.delete(f"{BASE}/api/v1/data-sources/{DS_ID}/semantic/fields/{FIELD_DESC_ID}", headers=headers)
    test(f"DELETE /semantic/fields/{FIELD_DESC_ID[:8]} 删除", resp.status_code == 200)

# 删除表描述
if TABLE_DESC_ID:
    resp = requests.delete(f"{BASE}/api/v1/data-sources/{DS_ID}/semantic/tables/orders", headers=headers)
    test("DELETE /semantic/tables/orders 级联删除", resp.status_code == 200)

# 删除数据源
resp = requests.delete(f"{BASE}/api/v1/data-sources/{DS_ID}", headers=headers)
test(f"DELETE /data-sources/{DS_ID[:8]} 删除", resp.status_code == 200)

# 确认已删除
resp = requests.get(f"{BASE}/api/v1/data-sources/{DS_ID}", headers=headers)
test(f"  确认已删除(404)", resp.status_code == 404)

# ==================== 9. 用户管理 ====================
print("\n【9】用户管理 (users, 需admin)")
resp = requests.get(f"{BASE}/api/v1/users/", headers=headers)
test("GET /users testuser非admin拒绝", resp.status_code == 403, resp.text)


# ==================== 10. API 文档 ====================
print("\n【10】API文档")
resp = requests.get(f"{BASE}/docs")
test("GET /docs Swagger UI", resp.status_code == 200)
resp = requests.get(f"{BASE}/openapi.json")
test("GET /openapi.json", resp.status_code == 200)

# ==================== 结果汇总 ====================
print("\n" + "=" * 70)
print(f"测试结果: {PASS} 通过, {FAIL} 失败, 共 {PASS+FAIL} 项")
print(f"通过率: {PASS/(PASS+FAIL)*100:.1f}%")
print("=" * 70)

sys.exit(0 if FAIL == 0 else 1)
