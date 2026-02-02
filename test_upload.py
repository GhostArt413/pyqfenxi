import requests
import os

# 测试图片上传和分析功能

def test_upload():
    url = 'http://localhost:3001/api/upload'
    
    # 准备测试图片文件
    # 注意：这里需要替换为实际存在的图片文件路径
    # 为了测试，我们可以创建一个简单的测试图片
    
    # 这里使用空文件模拟，实际测试时需要替换为真实图片
    files = []
    for i in range(5):
        # 创建临时文件
        temp_file = f'test_image_{i}.jpg'
        with open(temp_file, 'w') as f:
            f.write('test')
        
        files.append(('images', (temp_file, open(temp_file, 'rb'), 'image/jpeg')))
    
    try:
        # 发送请求
        response = requests.post(url, files=files)
        print('上传响应:', response.json())
        
        if response.status_code == 200:
            # 测试分析功能
            analyze_url = 'http://localhost:3001/api/analyze'
            analyze_data = {
                'files': response.json()['files']
            }
            
            analyze_response = requests.post(analyze_url, json=analyze_data)
            print('分析响应:', analyze_response.json())
        
    finally:
        # 清理临时文件
        for i in range(5):
            temp_file = f'test_image_{i}.jpg'
            if os.path.exists(temp_file):
                os.remove(temp_file)

if __name__ == '__main__':
    test_upload()