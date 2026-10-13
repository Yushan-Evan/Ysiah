/*应用常量与数据结构*/

        const APP_PREFIX = 'CHAT_APP_V3_';
        const DEFAULT_KAOMOJI = [
            '(｡•̀ᴗ-)✧', '(´▽｀)', '(￣▽￣)~*', '(づ￣ ³￣)づ', '(◕‿◕)♡',
            '(｡♥‿♥｡)', '(＾▽＾)', '(๑˃ᴗ˂)ﻭ', '(っ˘ω˘ς)', '(〃\'ω\'〃)',
            '(・ω・)ノ', '(*´∀｀*)', '( ˘ ³˘)♥', '(｡・//ε//・｡)', '(⑅˘꒳˘)',
            '٩(๑❛ᴗ❛๑)۶', '(ᵔᴥᵔ)', '(•̀ᴗ•́)و', '(◍•ᴗ•◍)❤', '(ノ◕ヮ◕)ノ*:・゚✧',
            '(￣ε￣＠)', '(。•́︿•̀。)', '(´-ω-`)', '(◞‸◟)', '(；ω；)',
            '(＞﹏＜)', '(๑•́ ₃ •̀๑)', '(♡˙︶˙♡)', '(｡ớ_ờ)ھ', '(￣ω￣)'
        ];        const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
        const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
        const MESSAGES_PER_PAGE = 50;
        
        const CONSTANTS = {
            HEADER_MOTTOS: [
                "无论何时都可以呼唤我的名字，它就是为你定制的咒语。",
                "世界上有多少人，就有多少故事。而你，是我故事里最温柔的章节。",
                "若黑夜落下，我依然想要成为光。",
                "欢迎回家。这里永远为你留一盏灯。",
                "不必害怕，我会一直站在你看得见的地方。",
                "你是我所有的例外与唯一。",
                "月色正好，适合想念你。",
                "风起时，是我在想你。",
                "有你在的每一刻，都值得被珍藏。",
                "我的温柔，只对你生效。"
            ],
            WELCOME_ANIMATIONS: [{
                line1: "♡ 爱 ♡",
                line2: "✧ 正在连接我们的思绪 ✧"
            },
                {
                    line1: "𝑳𝒐𝒗𝒆",
                    line2: "若要由我来谈论爱的话"
                },
                {
                    line1: "𝕰𝖈𝖍𝖔",
                    line2: "听见我的回音了吗？"
                },
                {
                    line1: "𝚂𝚘𝚞𝚕𝚖𝚊𝚝𝚎",
                    line2: "灵魂正在共振"
                },
                {
                    line1: "Akashic Eye",
                    line2: "链接已建立"
                },
                {
                    line1: "✦ 相遇 ✦",
                    line2: "在万千人海中遇见你"
                },
                {
                    line1: "詩篇",
                    line2: "为你写下的每一行诗"
                },
                {
                    line1: "Melody",
                    line2: "心跳的旋律为你奏响"
                },
                {
                    line1: "Destiny",
                    line2: "命运的红线将我们相连"
                },
                {
                    line1: "Memory",
                    line2: "创造属于我们的回忆"
                },
                {
                    line1: "言葉",
                    line2: "想传达给你的话语"
                },
                {
                    line1: "絆",
                    line2: "看不见的羁绊"
                },
                {
                    line1: "未来",
                    line2: "一起走向的未来"
                },
                {
                    line1: "希望",
                    line2: "你就是我的希望"
                },
                {
                    line1: "光",
                    line2: "你是我生命中的光"
                },
                {
                    line1: "Amore",
                    line2: "心跳漏拍的那一秒"
                },
                {
                    line1: "共振",
                    line2: "频率相同的两个灵魂"
                },
                {
                    line1: "∞",
                    line2: "无限循环的思念"
                },
                {
                    line1: "Serendipity",
                    line2: "最美丽的意外"
                },
                {
                    line1: "浮世",
                    line2: "沉浮人世间的温柔"
                },
                {
                    line1: "量子纠缠",
                    line2: "超越距离的默契"
                },
                {
                    line1: "Elysian",
                    line2: "与你共度的理想乡"
                },
                {
                    line1: "星轨",
                    line2: "交汇时互放的光亮"
                },
                {
                    line1: "虹色",
                    line2: "折射出所有的可能"
                },
                {
                    line1: "Paracosm",
                    line2: "共同构建的私宇宙"
                },
                {
                    line1: "潮汐",
                    line2: "因你而起的律动"
                },
                {
                    line1: "Æther",
                    line2: "弥漫在空气中的悸动"
                },
                {
                    line1: "双星",
                    line2: "彼此环绕的永恒舞蹈"
                },
                {
                    line1: "绯色",
                    line2: "染上脸颊的温度"
                },
                {
                    line1: "Symphony",
                    line2: "生命交织的乐章"
                },
                {
                    line1: "经纬",
                    line2: "注定相遇的坐标"
                },
                {
                    line1: "Nebula",
                    line2: "朦胧而璀璨的心事"
                },
                {
                    line1: "时雨",
                    line2: "恰到好处的温柔"
                },
                {
                    line1: "Event Horizon",
                    line2: "再也无法逃离的引力"
                },
                {
                    line1: "花火",
                    line2: "刹那即永恒的光芒"
                },
                {
                    line1: "ℰ𝓉𝑒𝓇𝓃𝒶𝓁",
                    line2: "时间停驻的此刻"
                },
                {
                    line1: "韶光",
                    line2: "与你共度的每寸光阴"
                },
                {
                    line1: "𝒮𝓊𝓂𝓂𝑒𝓇",
                    line2: "永不结束的盛夏"
                },
                {
                    line1: "星霜",
                    line2: "共同经历的岁月"
                },
                {
                    line1: "𝓚𝓲𝓼𝓼",
                    line2: "未说出口的告白"
                },
                {
                    line1: "月下",
                    line2: "两人独处的夜晚"
                },
                {
                    line1: "𝓕𝓸𝓻𝓮𝓿varepsilon𝓻",
                    line2: "想要延续的永远"
                },
                {
                    line1: "朝露",
                    line2: "晶莹剔透的真心"
                },
                {
                    line1: "𝓜𝓲𝓻𝓪𝓬𝓵𝓮",
                    line2: "你就是奇迹本身"
                },
                {
                    line1: "春风",
                    line2: "轻轻拂过的温柔"
                },
                {
                    line1: "𝓛𝓾𝓬𝓴𝔂",
                    line2: "此生最大的幸运"
                },
                {
                    line1: "萤火",
                    line2: "黑暗中指引的光"
                },
                {
                    line1: "𝓗𝓮𝓪𝓻𝓽",
                    line2: "为你跳动的心脏"
                },
                {
                    line1: "初雪",
                    line2: "纯洁无瑕的爱意"
                },
                {
                    line1: "𝓒𝓸𝓶𝓮𝓽",
                    line2: "划过天际的相遇"
                },
                {
                    line1: "潮鸣",
                    line2: "内心澎湃的声音"
                },
                {
                    line1: "𝓢𝓽𝓪𝓻𝓭𝓾𝓼𝓽",
                    line2: "散落在身的星尘"
                },
                {
                    line1: "梧桐",
                    line2: "等待凤凰的执着"
                },
                {
                    line1: "𝓟𝓻𝓮𝓬𝓲𝓸𝓾𝓼",
                    line2: "视若珍宝的你我"
                },
                {
                    line1: "青空",
                    line2: "澄澈如你的眼眸"
                },
                {
                    line1: "𝒜𝓂𝒶𝓇𝓃𝓉𝒽",
                    line2: "永不凋零的心意"
                },
                {
                    line1: "Étoile",
                    line2: "你是我唯一的星辰"
                },
                {
                    line1: "𝑩𝒍ü𝒕𝒆",
                    line2: "悄然绽放的恋慕"
                },
                {
                    line1: "運命",
                    line2: "避无可避的相遇"
                },
                {
                    line1: "𝑪𝒆𝒍𝒆𝒔𝒕𝒆",
                    line2: "来自天际的馈赠"
                },
                {
                    line1: "恋心",
                    line2: "藏不住的悸动"
                },
                {
                    line1: "𝑺𝒆𝒓𝒂𝒑𝒉",
                    line2: "守护你的六翼天使"
                },
                {
                    line1: "一期一会",
                    line2: "一生一次的邂逅"
                },
                {
                    line1: "𝑬𝒑𝒐𝒏𝒂",
                    line2: "穿越时空的眷恋"
                },
                {
                    line1: "月の雫",
                    line2: "月光凝成的泪滴"
                },
                {
                    line1: "𝑽𝒆𝒓𝒔𝒂𝒊𝒍𝒍𝒆𝒔",
                    line2: "为你建造的宫殿"
                },
                {
                    line1: "千夜一夜",
                    line2: "诉不尽的夜话"
                },
                {
                    line1: "𝑴𝒂𝒓é𝒆",
                    line2: "温柔席卷的浪潮"
                },
                {
                    line1: "桃源郷",
                    line2: "只属于两人的乐土"
                },
                {
                    line1: "𝑺𝒐𝒖𝒇𝒇𝒍𝒆𝒓",
                    line2: "甜蜜的折磨"
                },
                {
                    line1: "桜吹雪",
                    line2: "纷飞如雪的思念"
                },
                {
                    line1: "𝑨𝒖𝒓𝒐𝒓𝒆",
                    line2: "黎明前的极光"
                },
                {
                    line1: "十六夜",
                    line2: "最圆满的夜晚"
                },
                {
                    line1: "𝑪𝒚𝒂𝒏𝒐𝒑𝒉𝒚𝒍𝒍𝒆",
                    line2: "青涩的恋之叶"
                },
                {
                    line1: "金木犀",
                    line2: "秋日里暗香浮动"
                },
            ],
            WELCOME_ICONS: [
                "fas fa-heart", "fas fa-star", "fas fa-moon", "fas fa-sun", "fas fa-cloud", "fas fa-feather", "fas fa-book", "fas fa-music", "fas fa-pen", "fas fa-key", "fas fa-compass", "fas fa-globe", "fas fa-leaf", "fas fa-water", "fas fa-fire", "fas fa-snowflake", "fas fa-umbrella", "fas fa-anchor", "fas fa-bell", "fas fa-gem", "fas fa-crown", "fas fa-dragon", "fas fa-feather-alt", "fas fa-fish", "fas fa-frog", "fas fa-hat-wizard", "fas fa-magic", "fas fa-ring", "fas fa-scroll", "fas fa-shield-alt", "fas fa-dove", "fas fa-cat", "fas fa-dog", "fas fa-horse", "fas fa-otter", "fas fa-paw", "fas fa-spider", "fas fa-kiwi-bird", "fas fa-crow", "fas fa-dove", "fas fa-seedling", "fas fa-tree", "fas fa-mountain", "fas fa-water", "fas fa-wind", "fas fa-volcano", "fas fa-meteor", "fas fa-satellite", "fas fa-rocket", "fas fa-user-astronaut"
            ],
            PARTNER_STATUSES: [],
            REPLY_MESSAGES: [
                "在想你。",
                "刚处理完一些文件，看到你的消息就停下了。",
                "今天的夜色很好，像你在身边时那样。",
                "小兔子今天也很乖，替我陪它一起好不好？",
                "……嗯，我在听。继续说。",
                "别太晚，我会担心。",
                "这句话我记住了。",
                "过来一点，离我近一点。",
                "你刚才发的那句，我看了三遍。",
                "我在开会，但还是偷偷回你了。",
                "想我了？",
                "今天也辛苦了。",
                "晚安之前，先跟我说一声。",
                "我给你留了一盏灯。",
                "你笑起来的时候，我这边的月色都亮了几分。",
                "不许说自己不好，在我这里不是。",
                "等我，很快就回来。",
                "这句喜欢，我收下了。",
                "窗外起风了，记得加件外套。",
                "你说的每一句话，我都有认真在听。",
                "今天的红酒，我开了一瓶，想分你半杯。",
                "你是我所有计划里，唯一的例外。",
                "不着急，我们有的是时间。",
                "这句话，我想听你当面再说一遍。",
                "照顾好自己，就是照顾我。",
                "无论你说什么，我都在。",
                "刚翻完一页书，想到的是你。",
                "……嗯？就只是想叫你一声。",
                "我不会让你一个人等的。"
            ],
            // 时段感知台词：克制使用，仅在部分回复中按真实时段挑选
            TIME_BASED_REPLIES: {                morning: [   // 06:00 - 09:00
                    "早。窗外的雾还没散。",
                    "起了吗？今天的咖啡刚好烫嘴。",
                    "这个点醒着，是没睡好还是自然醒？"
                ],
                forenoon: [  // 09:00 - 12:00
                    "在忙？那我不打扰你，这句就当我悄悄路过。",
                    "上午的光刚好落在书页上，想起你。"
                ],
                afternoon: [ // 12:00 - 18:00
                    "午饭别对付。",
                    "今天的天色很好，如果你在身边就好了。",
                    "这个点犯困了？撑住，下班再说。"
                ],
                evening: [   // 18:00 - 23:00
                    "忙完了吗？今天也辛苦了。",
                    "夜色沉下来了，我这边的灯亮着。",
                    "晚饭吃过了吗，不许敷衍。"
                ],
                night: [     // 23:00 - 06:00
                    "还没睡？不许熬夜，我会担心。",
                    "这个点还醒着，是在想我吗？",
                    "放下手机，我在梦里等你。"
                ]
            },
            // 天气联动回复
            WEATHER_REPLIES: {
                sunny: [
                    "今天太阳很好，适合想你。",
                    "窗外阳光正好，像你笑起来的样子。",
                    "晴天的话，出门记得防晒，我会心疼。"
                ],
                cloudy: [
                    "今天天阴阴的，想给你送杯热饮。",
                    "多云的天气，适合窝在沙发里发呆。",
                    "天色暗下来了，我这边的灯给你留着。"
                ],
                rainy: [
                    "下雨了，出门记得带伞。",
                    "雨声很好听，但我更想听你说话。",
                    "下雨就别乱跑了，待在屋里，我陪你。"
                ],
                snowy: [
                    "下雪了，记得多穿点，别冻着。",
                    "雪落下来的时候，我在想你。",
                    "初雪的话，要一起走一走才浪漫。"
                ],
                foggy: [
                    "今天雾很大，走路小心点。",
                    "雾蒙蒙的天气，适合说点悄悄话。"
                ]
            },
            REPLY_EMOJIS: [
                "🐰","🌹","🍷","🌙","✨","🤎","❤️","🖤","💋","📖",
                "🎻","🌌","🕯️","🍂","🥀","💫","👔","🖋️","🌷","🩸",
                "🦇","🔥","🌑","🌺","💌","🍁","🪻","🕰️"
            ],
            POKE_ACTIONS: [],
            TAROT_CARDS: [
                { name: "愚人", eng: "The Fool", meaning: "新的开始、冒险、天真、无畏", keyword: "流浪", icon: "fa-hiking" },
                { name: "魔术师", eng: "The Magician", meaning: "创造力、技能、意志力、化腐朽为神奇", keyword: "创造", icon: "fa-hat-wizard" },
                { name: "女祭司", eng: "The High Priestess", meaning: "直觉、潜意识、神秘、智慧", keyword: "智慧", icon: "fa-book-open" },
                { name: "女帝", eng: "The Empress", meaning: "丰饶、母性、自然、感官享受", keyword: "丰收", icon: "fa-seedling" },
                { name: "皇帝", eng: "The Emperor", meaning: "权威、结构、控制、父亲形象", keyword: "支配", icon: "fa-crown" },
                { name: "教皇", eng: "The Hierophant", meaning: "传统、信仰、教导、精神指引", keyword: "援助", icon: "fa-church" },
                { name: "恋人", eng: "The Lovers", meaning: "爱、和谐、关系、价值观的选择", keyword: "结合", icon: "fa-heart" },
                { name: "战车", eng: "The Chariot", meaning: "意志力、胜利、决心、自我控制", keyword: "胜利", icon: "fa-horse-head" },
                { name: "力量", eng: "Strength", meaning: "勇气、耐心、控制、内在力量", keyword: "意志", icon: "fa-fist-raised" },
                { name: "隐士", eng: "The Hermit", meaning: "内省、孤独、寻求真理、指引", keyword: "探索", icon: "fa-lightbulb" },
                { name: "命运之轮", eng: "Wheel of Fortune", meaning: "循环、命运、转折点、运气", keyword: "轮回", icon: "fa-dharmachakra" },
                { name: "正义", eng: "Justice", meaning: "公正、真理、因果、法律", keyword: "均衡", icon: "fa-balance-scale" },
                { name: "倒吊人", eng: "The Hanged Man", meaning: "牺牲、新的视角、等待、放下", keyword: "奉献", icon: "fa-user-injured" },
                { name: "死神", eng: "Death", meaning: "结束、转变、重生、放手", keyword: "结束", icon: "fa-skull" },
                { name: "节制", eng: "Temperance", meaning: "平衡、适度、耐心、调和", keyword: "净化", icon: "fa-glass-whiskey" },
                { name: "恶魔", eng: "The Devil", meaning: "束缚、物质主义、欲望、诱惑", keyword: "诱惑", icon: "fa-link" },
                { name: "高塔", eng: "The Tower", meaning: "突变、混乱、启示、破坏", keyword: "毁灭", icon: "fa-gopuram" },
                { name: "星星", eng: "The Star", meaning: "希望、灵感、平静、治愈", keyword: "希望", icon: "fa-star" },
                { name: "月亮", eng: "The Moon", meaning: "幻觉、恐惧、焦虑、潜意识", keyword: "不安", icon: "fa-moon" },
                { name: "太阳", eng: "The Sun", meaning: "快乐、成功、活力、清晰", keyword: "生命", icon: "fa-sun" },
                { name: "审判", eng: "Judgement", meaning: "复活、觉醒、号召、决定", keyword: "复活", icon: "fa-bullhorn" },
                { name: "世界", eng: "The World", meaning: "完成、整合、成就、圆满", keyword: "达成", icon: "fa-globe-americas" }
            ]
        };

window.APP_PREFIX = APP_PREFIX;
