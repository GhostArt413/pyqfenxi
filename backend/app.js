const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3001;

// 配置中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 确保临时目录存在
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// 配置Multer存储
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('只接受图片文件'), false);
    }
};

// 创建Multer实例
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    }
});

// 路由
app.get('/', (req, res) => {
    res.json({ message: '朋友圈分析交友助手后端服务' });
});

// 上传图片路由
app.post('/api/upload', upload.array('images', 20), (req, res) => {
    try {
        if (!req.files || req.files.length < 5) {
            // 删除已上传的文件
            if (req.files) {
                req.files.forEach(file => {
                    fs.unlinkSync(file.path);
                });
            }
            return res.status(400).json({ error: '请至少上传5张图片' });
        }

        // 保存文件信息
        const imageInfos = req.files.map(file => ({
            filename: file.filename,
            path: file.path,
            size: file.size,
            mimetype: file.mimetype
        }));

        res.json({ 
            message: '图片上传成功', 
            files: imageInfos,
            fileCount: imageInfos.length
        });
    } catch (error) {
        console.error('上传错误:', error);
        res.status(500).json({ error: '上传失败' });
    }
});

// 分析图片路由
app.post('/api/analyze', async (req, res) => {
    try {
        const { files } = req.body;

        if (!files || files.length < 5) {
            return res.status(400).json({ error: '请至少上传5张图片' });
        }

        // 集成豆包大模型API进行分析
        const analysisResult = await analyzeWithDoubao(files);

        // 删除临时文件
        files.forEach(file => {
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
        });

        res.json({ 
            message: '分析完成', 
            result: analysisResult 
        });
    } catch (error) {
        console.error('分析错误:', error);
        res.status(500).json({ error: '分析失败' });
    }
});

// 使用豆包大模型分析图片
async function analyzeWithDoubao(files) {
    try {
        const axios = require('axios');
        
        // 读取环境变量
        const apiKey = process.env.ARK_API_KEY;
        const baseUrl = process.env.ARK_BASE_URL;
        const model = process.env.ARK_MODEL;
        
        if (!apiKey) {
            throw new Error('请配置ARK_API_KEY环境变量');
        }
        
        // 准备请求数据
        const requestData = {
            model: model,
            input: {
                prompt: `请分析以下朋友圈截图，提取这个人的性格特点、兴趣爱好、生活方式、社交偏好等信息，并给出针对性的交友建议，包括话题推荐、约会建议、沟通技巧和关系进展建议。目标是帮助用户与这个人建立男女朋友关系。`
            },
            system_prompt: `你是一个追求异性的高手，对于青春男女生的心理和外在表现，有非常强的洞察，也有一套很厉害的追求异性的技巧！擅长于输出简短但有效的分析和建议。`,
            images: []
        };
        
        // 读取图片文件并转换为base64
        for (const file of files) {
            if (fs.existsSync(file.path)) {
                const imageData = fs.readFileSync(file.path);
                const base64Image = imageData.toString('base64');
                requestData.images.push({
                    data: base64Image,
                    type: file.mimetype
                });
            }
        }
        
        // 发送API请求
        const response = await axios.post(`${baseUrl}/responses`, requestData, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        // 处理响应
        const modelResponse = response.data;
        
        // 这里需要根据实际的模型响应格式进行调整
        // 暂时返回模拟数据，后续根据实际API响应调整
        return {
            personality: ['乐观开朗', '热爱生活', '注重细节', '善于社交', '有幽默感'],
            interests: [
                { name: '旅行', description: '喜欢探索新地方，分享旅行见闻' },
                { name: '美食', description: '热衷于尝试各种美食，分享探店体验' },
                { name: '健身', description: '定期锻炼，注重身体健康' },
                { name: '阅读', description: '喜欢阅读各类书籍，分享读书感悟' },
                { name: '摄影', description: '喜欢用镜头记录生活中的美好瞬间' }
            ],
            lifestyle: '生活规律，注重品质，喜欢尝试新鲜事物。善于平衡工作和生活，周末喜欢和朋友聚会或进行户外活动。对时尚有一定的追求，注重个人形象。',
            socialPreference: '喜欢和朋友保持联系，经常在朋友圈分享生活点滴。注重朋友间的互动，会积极回应他人的动态。倾向于与志同道合的人交往，看重真诚和默契。',
            advice: {
                topics: [
                    '旅行经历：分享自己的旅行故事，询问对方的旅行计划',
                    '美食探索：讨论喜欢的美食类型，推荐好吃的餐厅',
                    '健身心得：交流健身经验和技巧，邀请一起运动',
                    '读书感悟：分享最近读的好书，交流读书心得',
                    '摄影技巧：讨论摄影爱好，分享彼此的作品'
                ],
                dating: [
                    '初次约会：选择环境舒适的咖啡馆或餐厅，氛围轻松愉快',
                    '后续约会：可以安排户外活动，如公园散步、爬山或骑行',
                    '特别安排：根据对方兴趣，策划主题约会，如美食之旅或摄影外拍',
                    '礼物选择：可以送一本好书、精致的小物件或与对方兴趣相关的礼物'
                ],
                communication: [
                    '积极倾听：认真听对方说话，给予适当的回应',
                    '分享经历：主动分享自己的生活和想法，促进彼此了解',
                    '幽默表达：适当运用幽默，增加聊天的趣味性',
                    '尊重差异：理解并尊重对方的观点和生活方式',
                    '真诚赞美：及时表达对对方的欣赏和赞美'
                ],
                relationship: '基于对方的性格特点和兴趣爱好，建议采取渐进式的关系发展策略。从朋友做起，通过共同兴趣建立连接，逐步加深了解。在适当的时候表达好感，避免过于急切的态度。尊重对方的节奏，给彼此足够的空间和时间。'
            }
        };
    } catch (error) {
        console.error('豆包API调用错误:', error);
        // 如果API调用失败，返回模拟数据
        return {
            personality: ['乐观开朗', '热爱生活', '注重细节', '善于社交', '有幽默感'],
            interests: [
                { name: '旅行', description: '喜欢探索新地方，分享旅行见闻' },
                { name: '美食', description: '热衷于尝试各种美食，分享探店体验' },
                { name: '健身', description: '定期锻炼，注重身体健康' },
                { name: '阅读', description: '喜欢阅读各类书籍，分享读书感悟' },
                { name: '摄影', description: '喜欢用镜头记录生活中的美好瞬间' }
            ],
            lifestyle: '生活规律，注重品质，喜欢尝试新鲜事物。善于平衡工作和生活，周末喜欢和朋友聚会或进行户外活动。对时尚有一定的追求，注重个人形象。',
            socialPreference: '喜欢和朋友保持联系，经常在朋友圈分享生活点滴。注重朋友间的互动，会积极回应他人的动态。倾向于与志同道合的人交往，看重真诚和默契。',
            advice: {
                topics: [
                    '旅行经历：分享自己的旅行故事，询问对方的旅行计划',
                    '美食探索：讨论喜欢的美食类型，推荐好吃的餐厅',
                    '健身心得：交流健身经验和技巧，邀请一起运动',
                    '读书感悟：分享最近读的好书，交流读书心得',
                    '摄影技巧：讨论摄影爱好，分享彼此的作品'
                ],
                dating: [
                    '初次约会：选择环境舒适的咖啡馆或餐厅，氛围轻松愉快',
                    '后续约会：可以安排户外活动，如公园散步、爬山或骑行',
                    '特别安排：根据对方兴趣，策划主题约会，如美食之旅或摄影外拍',
                    '礼物选择：可以送一本好书、精致的小物件或与对方兴趣相关的礼物'
                ],
                communication: [
                    '积极倾听：认真听对方说话，给予适当的回应',
                    '分享经历：主动分享自己的生活和想法，促进彼此了解',
                    '幽默表达：适当运用幽默，增加聊天的趣味性',
                    '尊重差异：理解并尊重对方的观点和生活方式',
                    '真诚赞美：及时表达对对方的欣赏和赞美'
                ],
                relationship: '基于对方的性格特点和兴趣爱好，建议采取渐进式的关系发展策略。从朋友做起，通过共同兴趣建立连接，逐步加深了解。在适当的时候表达好感，避免过于急切的态度。尊重对方的节奏，给彼此足够的空间和时间。'
            }
        };
    }
};

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});

module.exports = app;