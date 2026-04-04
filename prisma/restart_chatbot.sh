#!/bin/bash
pkill -f "python.*app.py" 2>/dev/null
sleep 2
cd /root/cafe-chatbot
nohup /root/cafe-chatbot/venv/bin/python app.py > /root/cafe-chatbot/chatbot.log 2>&1 &
echo "PID=$!"
sleep 3
tail -10 /root/cafe-chatbot/chatbot.log
