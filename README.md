# tg-worker
Cloudflare worker for telegram bot



# Test

## GET 请求

```sh
curl -X GET "http://localhost:8787/bot<your_bot_token>/getMe"
```

## POST 请求

```sh
curl -X POST "http://localhost:8787/bot<your_bot_token>/sendMessage" \
     -H "Content-Type: application/json" \
     -d '{"chat_id": "<your_chat_id>", "text": "Hello, World!"}'
```
