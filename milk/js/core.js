/*核心应用逻辑：数据加载保存、消息渲染、会话管理等*/

        function clearAllAppData() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease;';
    overlay.innerHTML = `
        <div style="background:var(--secondary-bg);border-radius:20px;padding:24px;width:88%;max-width:340px;box-shadow:0 20px 60px rgba(0,0,0,0.4);animation:modalContentSlideIn 0.3s ease forwards;">
            <div style="text-align:center;margin-bottom:20px;">
                <div style="width:52px;height:52px;border-radius:50%;background:rgba(255,80,80,0.12);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">
                    <i class="fas fa-trash-alt" style="color:#ff5050;font-size:20px;"></i>
                </div>
                <div style="font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:6px;">重置数据</div>
                <div style="font-size:12px;color:var(--text-secondary);">请选择要重置的范围</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:10px;">
                <button id="_reset_current" style="width:100%;padding:12px 16px;border:1px solid var(--border-color);border-radius:12px;background:var(--primary-bg);color:var(--text-primary);font-size:13px;font-weight:600;cursor:pointer;text-align:left;display:flex;align-items:center;gap:10px;transition:all 0.2s;">
                    <i class="fas fa-comment-slash" style="color:var(--accent-color);font-size:15px;width:18px;text-align:center;"></i>
                    <span>仅清除当前会话消息</span>
                </button>
                <button id="_reset_all" style="width:100%;padding:12px 16px;border:1px solid rgba(255,80,80,0.3);border-radius:12px;background:rgba(255,80,80,0.06);color:#ff5050;font-size:13px;font-weight:600;cursor:pointer;text-align:left;display:flex;align-items:center;gap:10px;transition:all 0.2s;">
                    <i class="fas fa-bomb" style="font-size:15px;width:18px;text-align:center;"></i>
                    <span>重置所有数据（完全清空）</span>
                </button>
                <button id="_reset_cancel" style="width:100%;padding:10px 16px;border:none;border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;transition:all 0.2s;">取消</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    function closeDialog() { overlay.remove(); }
    overlay.addEventListener('click', e => { if (e.target === overlay) closeDialog(); });
    const _resetCancelBtn = document.getElementById('_reset_cancel');
    const _resetCurrentBtn = document.getElementById('_reset_current');
    const _resetAllBtn = document.getElementById('_reset_all');

    if (_resetCancelBtn) _resetCancelBtn.onclick = closeDialog;

    if (_resetCurrentBtn) _resetCurrentBtn.onclick = () => {
        closeDialog();
        if (confirm('确定要清除当前会话的所有消息吗？此操作无法恢复！')) {
            messages = [];
            window.messages = messages; // 双保险：同步 window 属性
            displayedMessageCount = HISTORY_BATCH_SIZE;

            // 立即清除 localStorage 备份，防止 _tryRecoverFromBackup 在 IndexedDB 写入前恢复旧消息
            try { localStorage.removeItem('BACKUP_V1_critical'); } catch(e) {}
            try { localStorage.removeItem('BACKUP_V1_timestamp'); } catch(e) {}

            // 直接写入 IndexedDB（跳过 500ms 防抖），确保刷新后不恢复
            localforage.setItem(getStorageKey('chatMessages'), []).catch(() => {});

            renderMessages();
            showNotification('当前会话消息已清除', 'success');
        }
    };

    if (_resetAllBtn) _resetAllBtn.onclick = () => {
        closeDialog();
        if (confirm('【高危操作】确定要重置所有数据吗？此操作将清除所有本地数据且无法恢复！')) {
            window._skipBackup = true;
            messages = [];
            settings = {};
            localforage.clear().then(() => {
                localStorage.clear();
                showNotification('所有数据已重置，页面即将刷新', 'info', 2000);
                setTimeout(() => { window.location.href = window.location.pathname + '?reset=' + Date.now(); }, 2000);
            }).catch(e => {
                window._skipBackup = false;
                showNotification('清除数据时发生错误', 'error');
                console.error("清除 localforage 失败:", e);
            });
        }
    };
}

function loadMoreHistory() {
    const historyLoader = document.getElementById('history-loader');
    const container = DOMElements && DOMElements.chatContainer;
    const currentOldestMsgIndex = messages.length - displayedMessageCount;

    if (!container) return;
    if (isLoadingHistory) return;

    if (currentOldestMsgIndex <= 0) {
        if (historyLoader) historyLoader.style.display = 'none';
        return;
    }

    isLoadingHistory = true;
    if (historyLoader) historyLoader.style.display = 'flex';

    const visibleWrappers = Array.from(container.querySelectorAll('.message-wrapper'));
    const firstVisible = visibleWrappers.find(function(el) {
        return el.offsetTop + el.offsetHeight >= container.scrollTop;
    }) || visibleWrappers[0] || null;

    const anchorId = firstVisible ? firstVisible.dataset.msgId : null;
    const anchorTop = firstVisible ? firstVisible.getBoundingClientRect().top : 0;

    const prevVisibility = container.style.visibility;
    const prevOverflow = container.style.overflow;
    const prevScrollBehavior = container.style.scrollBehavior;
    const prevOpacity = container.style.opacity;

    container.style.opacity = '0.015';
    container.style.visibility = 'hidden';
    container.style.overflow = 'hidden';
    container.style.scrollBehavior = 'auto';

    setTimeout(() => {
        displayedMessageCount = Math.min(messages.length, displayedMessageCount + HISTORY_BATCH_SIZE);
        renderMessages(true);

        requestAnimationFrame(() => {
            if (anchorId) {
                const newAnchor = container.querySelector('[data-msg-id="' + anchorId + '"]');
                if (newAnchor) {
                    const newTop = newAnchor.getBoundingClientRect().top;
                    container.scrollTop += (newTop - anchorTop);
                }
            }

            requestAnimationFrame(() => {
                container.style.opacity = prevOpacity || '';
                container.style.visibility = prevVisibility || '';
                container.style.overflow = prevOverflow || '';
                container.style.scrollBehavior = prevScrollBehavior || '';

                if (historyLoader) {
                    historyLoader.style.display = (messages.length > displayedMessageCount) ? 'flex' : 'none';
                }
                isLoadingHistory = false;
            });
        });
    }, 120);
}


        function getDefaultSettings() {
            return {
                partnerName: "陆沉",
                myName: "我",
                myStatus: "在线",
                partnerStatus: "在线",
                isDarkMode: false,
                colorTheme: "crimson",
                soundEnabled: true,
                typingIndicatorEnabled: true,
                readReceiptsEnabled: true,
                replyEnabled: true,
                lastStatusChange: Date.now(),
                nextStatusChange: 1 + Math.random() * 7,
                fontSize: 16,
                bubbleStyle: 'standard',
                messageFontFamily: "'Noto Serif SC', serif",
                messageFontWeight: 400,
                messageLineHeight: 1.5,
                musicPlayerEnabled: false,
                replyDelayMin: 3000,
                replyDelayMax: 7000,
                inChatAvatarEnabled: true,
                inChatAvatarSize: 36,
                inChatAvatarPosition: 'center',
                alwaysShowAvatar: false,
                showPartnerNameInChat: false,
                customFontUrl: "", 
        customBubbleCss: "",
        customGlobalCss: "",
                myAvatarFrame: null, 
                partnerAvatarFrame: null,
                myAvatarShape: 'circle',
                partnerAvatarShape: 'circle',
autoSendEnabled: false,
autoSendInterval: 5,
        allowReadNoReply: false, 
        readNoReplyChance: 0.2,
        timeFormat: 'HH:mm',
        customSoundUrl: '',
        // 音效：两方分别可选（若对应 URL 为空则使用内置预设）
        mySendSoundPreset: 'tone_low',
        mySendCustomSoundUrl: '',
        partnerMessageSoundPreset: 'tone_low',
        partnerMessageCustomSoundUrl: '',
        myPokeSoundPreset: 'tone_low',
        myPokeCustomSoundUrl: '',
        partnerPokeSoundPreset: 'tone_low',
        partnerPokeCustomSoundUrl: '',
        soundVolume: 0.15,
        bottomCollapseMode: false,
        emojiMixEnabled: true
            };
        }


        function renderBackgroundGallery() {
            const list = document.getElementById('background-gallery-list');
            if (!list) return;

            list.innerHTML = '';

            
            const addBtn = document.createElement('div');
            addBtn.className = 'bg-item bg-add-btn';
            
            addBtn.innerHTML = '<i class="fas fa-plus"></i><span></span>';
            addBtn.onclick = () => document.getElementById('bg-gallery-input').click();
            list.appendChild(addBtn);

            const currentBg = safeGetItem(getStorageKey('chatBackground'));

            savedBackgrounds.forEach((bg, index) => {
                const item = document.createElement('div');
                let isActive = false;

                if (currentBg && currentBg === bg.value) isActive = true;

                item.className = `bg-item ${isActive ? 'active': ''}`;

                if (bg.type === 'image') {
                    item.innerHTML = `<img src="${bg.value}" loading="lazy" alt="bg">`;
                } else {
                    item.innerHTML = `<div class="bg-color-block" style="background: ${bg.value}"></div>`;
                }

                item.onclick = (e) => {
                    if (e.target.closest('.bg-delete-btn')) return;
                    applyBackground(bg.value);
                    safeSetItem(getStorageKey('chatBackground'), bg.value);
                    localforage.setItem(getStorageKey('chatBackground'), bg.value);
                    renderBackgroundGallery();
                    showNotification('背景已切换', 'success');
                };

                if (bg.id.startsWith('user-')) {
                    const delBtn = document.createElement('div');
                    delBtn.className = 'bg-delete-btn';
                    delBtn.innerHTML = '<i class="fas fa-trash"></i>';
                    delBtn.title = "删除此背景";
                    delBtn.onclick = (e) => {
                        e.stopPropagation();
                        if (confirm('确定删除这张背景图吗？')) {
                            savedBackgrounds.splice(index, 1);
                            saveBackgroundGallery();

                            if (isActive) {
                                removeBackground(); 
                                renderBackgroundGallery();
                            } else {
                                renderBackgroundGallery();
                            }
                        }
                    };
                    item.appendChild(delBtn);
                }

                list.appendChild(item);
            });
        }



        function saveBackgroundGallery() {
    localforage.setItem(getStorageKey('backgroundGallery'), savedBackgrounds);
}


        const applyBackground = (value) => {
            if (!value || typeof value !== 'string') return;
            try {
                if (value.startsWith('linear-gradient') || value.startsWith('#') || value.startsWith('rgb')) {
                    document.documentElement.style.setProperty('--chat-bg-image', value);
                } else {
                    const cssValue = value.startsWith('url(') ? value : `url(${value})`;
                    document.documentElement.style.setProperty('--chat-bg-image', cssValue);
                }
                document.body.classList.add('with-background');
            } catch (e) {
                if (typeof removeBackground === 'function') removeBackground();
            }
        };


const loadData = async () => {
    try {
        settings = getDefaultSettings();

        
        const results = await Promise.allSettled([
            localforage.getItem(getStorageKey('chatSettings')),
            localforage.getItem(getStorageKey('chatMessages')),
            localforage.getItem(getStorageKey('backgroundGallery')),
            localforage.getItem(getStorageKey('customReplies')),
            localforage.getItem(getStorageKey('customPokes')),
            localforage.getItem(getStorageKey('customStatuses')),
            localforage.getItem(getStorageKey('customMottos')),
            localforage.getItem(getStorageKey('customIntros')),
            localforage.getItem(getStorageKey('anniversaries')),
            localforage.getItem(getStorageKey('stickerLibrary')),
            localforage.getItem(`${APP_PREFIX}customThemes`),
            localforage.getItem(getStorageKey('chatBackground')),
            localforage.getItem(getStorageKey('partnerAvatar')),
            localforage.getItem(getStorageKey('myAvatar')),
            localforage.getItem(getStorageKey('partnerPersonas')), 
            localforage.getItem(getStorageKey('showPartnerNameInChat')),
            localforage.getItem(`${APP_PREFIX}themeSchemes`),
            localforage.getItem(getStorageKey('myStickerLibrary')),
            localforage.getItem(getStorageKey('customReplyGroups')),
            localforage.getItem(getStorageKey('customPokeGroups')),
            localforage.getItem(getStorageKey('customStatusGroups'))
        ]);
        const getVal = (index) => results[index].status === 'fulfilled' ? results[index].value : null;

        const savedSettings = getVal(0);
        const savedMessages = getVal(1);
        const savedBgGallery = getVal(2);
        const savedCustomReplies = getVal(3);
        const savedPokes = getVal(4);
        const savedStatuses = getVal(5);
        const savedMottos = getVal(6);
        const savedIntros = getVal(7);
        const savedAnniversaries = getVal(8);
        const savedStickers = getVal(9);
        const savedCustomThemes = getVal(10);
        const savedChatBg = getVal(11);
        const partnerAvatarSrc = getVal(12);
        const myAvatarSrc = getVal(13);
        const savedPartnerPersonas = getVal(14);
        const savedShowNameConfig = getVal(15);
        const savedThemeSchemes = getVal(16);
        const savedMyStickers = getVal(17);
        const savedReplyGroups = getVal(18);
        const savedPokeGroups = getVal(19);
        const savedStatusGroups = getVal(20);

        if (savedPartnerPersonas) partnerPersonas = savedPartnerPersonas;

        if (savedSettings) Object.assign(settings, savedSettings);

        if (settings.showPartnerNameInChat !== undefined) {
            showPartnerNameInChat = settings.showPartnerNameInChat;
        } else if (savedShowNameConfig !== null) {
            showPartnerNameInChat = savedShowNameConfig;
        }
        document.body.classList.toggle('show-partner-name', showPartnerNameInChat);
        try {
            if (settings.customFontUrl) applyCustomFont(settings.customFontUrl);
            if (settings.customBubbleCss) applyCustomBubbleCss(settings.customBubbleCss);
            if (settings.customGlobalCss) applyGlobalThemeCss(settings.customGlobalCss);
        } catch(e) { console.warn("样式应用失败", e); }
        
        if (savedPokes) customPokes = savedPokes;
        else customPokes = [...CONSTANTS.POKE_ACTIONS];

        if (savedStatuses) customStatuses = savedStatuses;
        else customStatuses = [...CONSTANTS.PARTNER_STATUSES];

        if (savedMottos) customMottos = savedMottos;
        else customMottos = [...CONSTANTS.HEADER_MOTTOS];
        
        if (savedIntros) customIntros = savedIntros;
        else customIntros = CONSTANTS.WELCOME_ANIMATIONS.map(a => `${a.line1}|${a.line2}`);

        if (savedMessages && Array.isArray(savedMessages)) {
            messages = savedMessages.map(m => ({
                ...m, timestamp: new Date(m.timestamp)
            }));
        } else {
            const backup = _tryRecoverFromBackup();
            if (backup && Array.isArray(backup.messages) && backup.messages.length > 0) {
                const timeSince = Math.round((Date.now() - backup.ts) / 60000);
                console.warn(`[loadData] 主存储无消息，正在从备份恢复（备份时间：${timeSince} 分钟前）`);
                messages = backup.messages.map(m => ({
                    ...m, timestamp: new Date(m.timestamp)
                }));
                if (backup.settings) Object.assign(settings, backup.settings);
                if (backup.anniversaries && Array.isArray(backup.anniversaries)) {
                    anniversaries = backup.anniversaries;
                }
                setTimeout(() => saveData(), 1000);
                showNotification(
                    `已从备份恢复 ${messages.length} 条消息${backup._truncated ? '（备份为最近200条）' : ''}`,
                    'warning', 6000
                );
            } else {
                messages = [];
            }
        }

        if (savedBgGallery) {
            savedBackgrounds = savedBgGallery;
        } else {
            savedBackgrounds = [{ id: 'preset-1', type: 'color', value: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }];
        }

        if (savedCustomReplies) customReplies = savedCustomReplies;
        if (savedReplyGroups) window.customReplyGroups = savedReplyGroups;
        if (savedPokeGroups) window.customPokeGroups = savedPokeGroups;
        if (savedStatusGroups) window.customStatusGroups = savedStatusGroups;
        if (savedAnniversaries) anniversaries = savedAnniversaries;
        if (savedStickers) stickerLibrary = savedStickers;
        if (savedMyStickers) myStickerLibrary = savedMyStickers;
        if (savedCustomThemes) customThemes = savedCustomThemes;
        if (savedThemeSchemes) themeSchemes = savedThemeSchemes;
        try { const ce = await localforage.getItem(getStorageKey('customEmojis')); if (ce && Array.isArray(ce)) customEmojis = ce; } catch(e) {}
        try {
            const ka = await localforage.getItem(getStorageKey('customKaomoji'));
            if (ka && Array.isArray(ka)) {
                customKaomoji = ka;
            } else if (ka === null && typeof DEFAULT_KAOMOJI !== 'undefined') {
                customKaomoji = DEFAULT_KAOMOJI.slice();
                localforage.setItem(getStorageKey('customKaomoji'), customKaomoji).catch(() => {});
            }
        } catch(e) {}
        window._customReplies = customReplies;
        window._CONSTANTS = CONSTANTS;

        if (DOMElements && DOMElements.partner && DOMElements.me) {
            updateAvatar(DOMElements.partner.avatar, partnerAvatarSrc);
            updateAvatar(DOMElements.me.avatar, myAvatarSrc);
        }

        if (savedChatBg) {
            applyBackground(savedChatBg);
        } else {
            const lsBg = safeGetItem(getStorageKey('chatBackground'));
            if (lsBg) {
                applyBackground(lsBg);
                localforage.setItem(getStorageKey('chatBackground'), lsBg);
            }
        }

        try { await initMoodData(); } catch(e) { console.warn("心情数据加载失败", e); }
        try { await loadEnvelopeData(); } catch(e) { console.warn("信封数据加载失败", e); }
        
        displayedMessageCount = HISTORY_BATCH_SIZE;
        
        setTimeout(() => {
            applyAllAvatarFrames();
            manageAutoSendTimer(); 
            checkEnvelopeStatus(); 
            updateUI();
            if (settings.customBubbleCss) {
                try { applyCustomBubbleCss(settings.customBubbleCss); } catch(e) {}
            }
        }, 100);

    } catch (e) {
        console.error("LoadData 内部致命错误:", e);
        settings = getDefaultSettings();
        messages = [];
        updateUI();
    }
};

const LIBRARY_CONFIG = {
    reply: {
        title: "回复库管理",
        tabs: [
            { id: 'custom', name: '字卡', mode: 'list' },
            { id: 'kaomoji', name: '颜文字', mode: 'grid' },
            { id: 'emojis', name: 'Emoji', mode: 'grid' },
            { id: 'stickers', name: '表情库', mode: 'grid' }
        ]
    },
    atmosphere: {
        title: "氛围感配置",
        tabs: [
            { id: 'pokes', name: '拍一拍', mode: 'list' },
            { id: 'statuses', name: '对方状态', mode: 'list' },
            { id: 'mottos', name: '顶部格言', mode: 'list' },
            { id: 'intros', name: '开场动画', mode: 'list' }
        ]
    }
};
let currentAnnType = 'anniversary'; 

window.openMyStickerSettings = function() {
    const picker = document.getElementById('user-sticker-picker');
    if (picker) picker.classList.remove('active');
    if (typeof currentMajorTab !== 'undefined') {
        currentMajorTab = 'reply';
        currentSubTab = 'stickers';
    }
    var sidebarBtns = document.querySelectorAll('.sidebar-btn');
    sidebarBtns.forEach(function(b) { b.classList.toggle('active', b.dataset.major === 'reply'); });
    if (typeof renderReplyLibrary === 'function') renderReplyLibrary();
    var modal = document.getElementById('custom-replies-modal');
    if (modal && typeof showModal === 'function') showModal(modal);
};

window.switchAnnType = function(type) {
    currentAnnType = type;
    currentAnniversaryType = type; 
    document.querySelectorAll('.ann-type-btn').forEach(btn => {
        if (btn.dataset.type === type) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    const desc = document.getElementById('ann-type-desc');
    if(desc) {
        desc.textContent = type === 'anniversary' 
            ? '计算从过去某一天到现在已经过了多少天 (例如: 相识、恋爱)' 
            : '计算从现在到未来某一天还剩下多少天 (例如: 生日、跨年)';
    }
};

window.deleteAnniversaryItem = function(id) {
    if(confirm("确定要删除这条记录吗？")) {
        anniversaries = anniversaries.filter(a => a.id !== id);
        throttledSaveData(); 
        renderAnniversariesList();
        showNotification('已删除', 'success');
        if (typeof playSound === 'function') playSound('anniversary');
    }
};

const _BACKUP_PREFIX = 'BACKUP_V1_';
function _backupCriticalData() {
    if (window._skipBackup) return;
    try {
        const backupPayload = {
            ts: Date.now(),
            messages: messages,
            settings: settings,
            sessionId: SESSION_ID,
            anniversaries: anniversaries
        };

        let payloadToStore = backupPayload;
        const msgSizeEstimate = messages.length * 500; 
        if (msgSizeEstimate > 3 * 1024 * 1024) {
            payloadToStore = {
                ...backupPayload,
                messages: messages.slice(-200),
                _truncated: true
            };
        }

        const json = JSON.stringify(payloadToStore);

        if (json.length > 4.5 * 1024 * 1024) {
            const smallerPayload = {
                ...payloadToStore,
                messages: messages.slice(-50),
                _truncated: true
            };
            const smallerJson = JSON.stringify(smallerPayload);
            localStorage.setItem(_BACKUP_PREFIX + 'critical', smallerJson);
        } else {
            localStorage.setItem(_BACKUP_PREFIX + 'critical', json);
        }
        localStorage.setItem(_BACKUP_PREFIX + 'timestamp', String(Date.now()));
    } catch (e) {
        console.warn('localStorage 备份写入失败（可能存储已满）:', e);
    }
}

function _tryRecoverFromBackup() {
    try {
        const raw = localStorage.getItem(_BACKUP_PREFIX + 'critical');
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

const saveData = async () => {
    if (!SESSION_ID) {
        console.warn('[saveData] SESSION_ID 尚未初始化，跳过保存以防数据写入临时 key');
        return;
    }

    const promises = [
        { key: 'chatSettings',           val: () => localforage.setItem(getStorageKey('chatSettings'), settings) },
        { key: 'customReplies',          val: () => localforage.setItem(getStorageKey('customReplies'), customReplies) },
        { key: 'customReplyGroups',      val: () => localforage.setItem(getStorageKey('customReplyGroups'), window.customReplyGroups || []) },
        { key: 'customPokeGroups',        val: () => localforage.setItem(getStorageKey('customPokeGroups'), window.customPokeGroups || []) },
        { key: 'customStatusGroups',      val: () => localforage.setItem(getStorageKey('customStatusGroups'), window.customStatusGroups || []) },
        { key: 'customEmojis',           val: () => localforage.setItem(getStorageKey('customEmojis'), customEmojis) },
        { key: 'customKaomoji',          val: () => localforage.setItem(getStorageKey('customKaomoji'), customKaomoji) },
        { key: 'anniversaries',          val: () => localforage.setItem(getStorageKey('anniversaries'), anniversaries) },
        { key: 'customPokes',            val: () => localforage.setItem(getStorageKey('customPokes'), customPokes) },
        { key: 'customStatuses',         val: () => localforage.setItem(getStorageKey('customStatuses'), customStatuses) },
        { key: 'customMottos',           val: () => localforage.setItem(getStorageKey('customMottos'), customMottos) },
        { key: 'customIntros',           val: () => localforage.setItem(getStorageKey('customIntros'), customIntros) },
        { key: 'stickerLibrary',         val: () => localforage.setItem(getStorageKey('stickerLibrary'), stickerLibrary) },
        { key: 'myStickerLibrary',       val: () => localforage.setItem(getStorageKey('myStickerLibrary'), myStickerLibrary) },
        { key: 'customThemes',           val: () => localforage.setItem(`${APP_PREFIX}customThemes`, customThemes) },
        { key: 'themeSchemes',           val: () => localforage.setItem(`${APP_PREFIX}themeSchemes`, themeSchemes) },
        { key: 'chatMessages',           val: () => localforage.setItem(getStorageKey('chatMessages'), messages) },
    ];

    const partnerAvatarSrc = (() => {
        try {
            const img = DOMElements.partner.avatar.querySelector('img');
            return img ? img.src : null;
        } catch(e) { return null; }
    })();
    const myAvatarSrc = (() => {
        try {
            const img = DOMElements.me.avatar.querySelector('img');
            return img ? img.src : null;
        } catch(e) { return null; }
    })();

    if (partnerAvatarSrc) {
        promises.push({ key: 'partnerAvatar', val: () => localforage.setItem(getStorageKey('partnerAvatar'), partnerAvatarSrc) });
    } else {
        promises.push({ key: 'partnerAvatar', val: () => localforage.removeItem(getStorageKey('partnerAvatar')) });
    }

    if (myAvatarSrc) {
        promises.push({ key: 'myAvatar', val: () => localforage.setItem(getStorageKey('myAvatar'), myAvatarSrc) });
    } else {
        promises.push({ key: 'myAvatar', val: () => localforage.removeItem(getStorageKey('myAvatar')) });
    }

    const results = await Promise.allSettled(promises.map(p => {
        try { return p.val(); }
        catch(e) { return Promise.reject(e); }
    }));

    const failed = [];
    results.forEach((r, i) => {
        if (r.status === 'rejected') {
            failed.push(promises[i].key);
            console.error(`[saveData] 保存失败: ${promises[i].key}`, r.reason);
        }
    });

    if (failed.length > 0) {
        console.warn(`[saveData] ${failed.length} 项写入失败，已触发 localStorage 降级备份`, failed);
    }

    _backupCriticalData();
};

        function initializeRandomUI() {


            document.querySelector('.header-motto').textContent = getRandomItem(CONSTANTS.HEADER_MOTTOS);
if (customMottos && customMottos.length > 0) {
    document.querySelector('.header-motto').textContent = getRandomItem(customMottos);
} else {
    document.querySelector('.header-motto').textContent = '';
}
            const placeholder = "";
            DOMElements.messageInput.placeholder = placeholder.length > 20 ? placeholder.substring(0, 20) + "...": placeholder;


            const starsContainer = document.getElementById('stars-container');
            starsContainer.innerHTML = '';
            const starCount = 80;
            for (let i = 0; i < starCount; i++) {
                const star = document.createElement('div');
                star.className = 'star';
                const x = Math.random() * 100;
                const y = Math.random() * 100;
                const size = Math.random() * 2.5 + 0.5;
                const duration = Math.random() * 4 + 2;
                const delay = Math.random() * 6;
                star.style.left = `${x}%`;
                star.style.top = `${y}%`;
                star.style.width = `${size}px`;
                star.style.height = `${size}px`;
                star.style.setProperty('--duration', `${duration}s`);
                star.style.animationDelay = `${delay}s`;
                starsContainer.appendChild(star);
            }
            const particlesContainer = document.getElementById('welcome-particles');
            if (particlesContainer) {
                particlesContainer.innerHTML = '';
                const types = ['petal', 'petal', 'petal', 'sparkle', 'sparkle'];
                for (let i = 0; i < 22; i++) {
                    const p = document.createElement('div');
                    const type = types[i % types.length];
                    p.className = `wp ${type}`;
                    const sz = type === 'petal' ? (Math.random() * 6 + 5) : (Math.random() * 4 + 2);
                    p.style.setProperty('--pSz', sz + 'px');
                    p.style.left = (Math.random() * 100) + '%';
                    p.style.setProperty('--pDur', (Math.random() * 10 + 9) + 's');
                    p.style.setProperty('--pDel', (Math.random() * 8) + 's');
                    p.style.setProperty('--pX1', (Math.random() * 50 - 25) + 'px');
                    p.style.setProperty('--pX2', (Math.random() * 80 - 40) + 'px');
                    p.style.setProperty('--pX3', (Math.random() * 50 - 25) + 'px');
                    particlesContainer.appendChild(p);
                }
            }

            const meteorsContainer = document.getElementById('welcome-meteors');
            if (meteorsContainer) {
                meteorsContainer.innerHTML = '';
                let meteorCount = 0;
                const MAX_METEORS = 12;
                const createMeteor = () => {
                    if (meteorCount >= MAX_METEORS) return;
                    meteorCount++;
                    const m = document.createElement('div');
                    m.className = 'meteor';
                    m.style.left = (Math.random() * 100) + '%';
                    m.style.top = (Math.random() * 35) + '%';
                    const dur = (Math.random() * 0.8 + 0.7);
                    m.style.setProperty('--mDur', dur + 's');
                    m.style.setProperty('--mDel', '0s');
                    m.style.setProperty('--mRot', (25 + Math.random() * 20) + 'deg');
                    meteorsContainer.appendChild(m);
                    setTimeout(() => { m.remove(); meteorCount = Math.max(0, meteorCount - 1); }, (dur + 0.1) * 1000);
                };
                for (let i = 0; i < 8; i++) setTimeout(createMeteor, i * 350);
                const meteorTimer = setInterval(createMeteor, 600);
                setTimeout(() => clearInterval(meteorTimer), 5000);
            }

            const loaderBarEl = document.getElementById('loader-tech-bar');
            if (loaderBarEl) {
                setTimeout(() => loaderBarEl.classList.add('pulsing'), 300);
            }


            const welcomeIcon = getRandomItem(CONSTANTS.WELCOME_ICONS);
document.querySelector('.logo-icon-main').innerHTML = `<i class="${welcomeIcon}"></i>`;

if (customIntros && customIntros.length > 0) {
    const rawIntro = getRandomItem(customIntros);
    const parts = rawIntro.split('|');
    const line1 = parts[0];
    const line2 = parts[1] || ""; 

    const titleEl = document.getElementById('welcome-title-glitch');
    const subEl = document.getElementById('welcome-subtitle-scramble');

    titleEl.classList.remove('playing');
    titleEl.textContent = line1;
    void titleEl.offsetWidth;
    titleEl.classList.add('playing');

    const scrambleText = (element, finalText, duration = 1500) => {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
                const length = finalText.length;
                let start = Date.now();

                const interval = setInterval(() => {
                    const now = Date.now();
                    const progress = (now - start) / duration;

                    if (progress >= 1) {
                        element.textContent = finalText;
                        clearInterval(interval);
                        return;
                    }

                    let result = '';

                    const revealIndex = Math.floor(progress * length);

                    for (let i = 0; i < length; i++) {
                        if (i <= revealIndex) {
                            result += finalText[i];
                        } else {

                            result += chars[Math.floor(Math.random() * chars.length)];
                        }
                    }
                    element.textContent = result;
                },
                    40);
            };


          setTimeout(() => {
        scrambleText(subEl, line2, 2000);
    }, 600);
} else {
    document.getElementById('welcome-title-glitch').textContent = "Ysiah";
    document.getElementById('welcome-subtitle-scramble').textContent = "请在设置中添加开场动画";
}


            const loaderBar = document.getElementById('loader-tech-bar');
            const statusText = document.getElementById('loader-status-text');
            loaderBar.style.width = '0%';
            const loadingPhases = [
                { width: '15%', text: 'INITIALIZING · 初始化中' },
                { width: '40%', text: 'LOADING MEMORIES · 读取记忆' },
                { width: '70%', text: 'BUILDING WORLD · 构建世界' },
                { width: '90%', text: 'ALMOST THERE · 即将完成' },
                { width: '100%', text: 'CONNECTED · 连接成功' }
            ];
            const delays = [100, 700, 1600, 2400, 2900];
            delays.forEach((delay, i) => {
                setTimeout(() => {
                    loaderBar.style.width = loadingPhases[i].width;
                    if (statusText) statusText.textContent = loadingPhases[i].text;
                }, delay);
            });
        }

function manageAutoSendTimer() {
    if (autoSendTimer) {
        clearInterval(autoSendTimer);
        autoSendTimer = null;
    }
    if (settings.autoSendEnabled) {
        const intervalMs = settings.autoSendInterval * 60 * 1000;
        
        autoSendTimer = setInterval(() => {
            if (!document.body.classList.contains('batch-favorite-mode')) {
                simulateReply(); 
            }
        }, intervalMs);
    }
}

        const updateUI = () => {
            const isCustomTheme = settings.colorTheme.startsWith('custom-');
            if (isCustomTheme) {
                const themeId = settings.colorTheme;
                const theme = customThemes.find(t => t.id === themeId);
                if (theme) {
                    applyTheme(theme.colors);
                } else {
                    DOMElements.html.setAttribute('data-color-theme', 'gold');
                }
            } else {
                DOMElements.html.setAttribute('data-color-theme', settings.colorTheme);
                applyTheme(null, true);
            }
            
            if (settings.customThemeColors && Object.keys(settings.customThemeColors).length > 0) {
                for (const [variable, value] of Object.entries(settings.customThemeColors)) {
                    document.documentElement.style.setProperty(variable, value);
                }
            }

            DOMElements.html.setAttribute('data-theme', settings.isDarkMode ? 'dark': 'light');
            DOMElements.themeToggle.innerHTML = settings.isDarkMode ? '<i class="fas fa-sun"></i>': '<i class="fas fa-moon"></i>';
            DOMElements.partner.name.textContent = settings.partnerName;
            DOMElements.me.name.textContent = settings.myName;
            DOMElements.partner.status.textContent = settings.partnerStatus || '在线';
            DOMElements.me.statusText.textContent = settings.myStatus;
            if (typeof window.updateDynamicNames === 'function') window.updateDynamicNames();
            document.documentElement.style.setProperty('--font-size', `${settings.fontSize}px`);
            
            const fontToUse = settings.messageFontFamily || "'Noto Serif SC', serif";
            
            document.documentElement.style.setProperty('--message-font-family', fontToUse);
            document.documentElement.style.setProperty('--font-family', fontToUse);
            document.documentElement.style.setProperty('--message-font-weight', settings.messageFontWeight);
            document.documentElement.style.setProperty('--message-line-height', settings.messageLineHeight);

            document.documentElement.style.setProperty('--in-chat-avatar-size', `${settings.inChatAvatarSize}px`);
            const _alignMap = { 'top': 'flex-start', 'center': 'center', 'bottom': 'flex-end', 'custom': 'flex-start' };
            document.documentElement.style.setProperty('--avatar-align', _alignMap[settings.inChatAvatarPosition || 'center'] || 'center');
            if (settings.inChatAvatarPosition === 'custom' && settings.inChatAvatarCustomOffset !== undefined) {
                document.documentElement.style.setProperty('--avatar-custom-offset', settings.inChatAvatarCustomOffset + 'px');
            }
            document.body.classList.toggle('always-show-avatar', !!settings.alwaysShowAvatar);
            if (typeof _applyCollapseState === 'function') _applyCollapseState(!!settings.bottomCollapseMode);
            document.body.classList.toggle('show-partner-name', !!(settings.showPartnerNameInChat || showPartnerNameInChat));

            document.querySelectorAll('.theme-color-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.theme === settings.colorTheme);
            });


            document.querySelectorAll('[data-bubble-style]').forEach(item => {
                item.classList.toggle('active', item.dataset.bubbleStyle === settings.bubbleStyle);
            });

            const _pillSyncMap = {
                '#reply-toggle': 'replyEnabled',
                '#sound-toggle': 'soundEnabled',
                '#read-receipts-toggle': 'readReceiptsEnabled',
                '#typing-indicator-toggle': 'typingIndicatorEnabled',
                '#read-no-reply-toggle': 'allowReadNoReply',
                '#emoji-mix-toggle': 'emojiMixEnabled',
                '#auto-send-toggle': 'autoSendEnabled'
            };
            for (const [sel, prop] of Object.entries(_pillSyncMap)) {
                const el = document.querySelector(sel);
                if (el) {
                    const val = prop === 'emojiMixEnabled' ? (settings[prop] !== false) : !!settings[prop];
                    el.classList.toggle('active', val);
                }
            }
            const _immToggle = document.getElementById('immersive-toggle');
            if (_immToggle) _immToggle.classList.toggle('active', document.body.classList.contains('immersive-mode'));

            renderMessages();
        };

        const updateAvatar = (element, src) => {
            if (src) element.innerHTML = `<img src="${src}" alt="avatar">`; else element.innerHTML = `<i class="fas fa-user"></i>`;
        };

        const removeBackground = () => {
            document.documentElement.style.removeProperty('--chat-bg-image');
            document.body.classList.remove('with-background');
            localforage.removeItem(getStorageKey('chatBackground'));
            safeRemoveItem(getStorageKey('chatBackground'));
            showNotification('背景图片已移除', 'success');
        };

        window.scrollToQuotedMessage = function(el) {
            const id = el.getAttribute('data-reply-id');
            if (!id) return;
            const tryScroll = () => {
                const target = document.querySelector(`[data-msg-id="${id}"]`);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    target.classList.add('msg-highlight');
                    setTimeout(() => target.classList.remove('msg-highlight'), 1500);
                    return true;
                }
                return false;
            };
            if (!tryScroll()) {
                const msgIndex = messages.findIndex(m => String(m.id) === String(id));
                if (msgIndex === -1) {
                    if (typeof showNotification === 'function') showNotification('消息可能已被删除', 'info');
                    return;
                }
                const needed = messages.length - msgIndex;
                if (needed > displayedMessageCount) {
                    displayedMessageCount = needed;
                    renderMessages(false);
                    setTimeout(tryScroll, 150);
                } else {
                    if (typeof showNotification === 'function') showNotification('消息可能已被删除', 'info');
                }
            }
        };

function createMessageFragment(msg, prevMsg, nextMsg, lastSenderRef) {
    const fragment = new DocumentFragment();
    const messageDate = new Date(msg.timestamp).toDateString();
    const prevDate = prevMsg ? new Date(prevMsg.timestamp).toDateString() : null;

    if (messageDate !== prevDate) {
        const dateDivider = document.createElement('div');
        dateDivider.className = 'date-divider';
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        const displayDate = (messageDate === today) ? '今天' : (messageDate === yesterday) ? '昨天' : new Date(msg.timestamp).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        dateDivider.innerHTML = `<span>${displayDate}</span>`;
        fragment.appendChild(dateDivider);
        lastSenderRef.current = null;
    }

    if (msg.type === 'system') {
        const systemMsgDiv = document.createElement('div');
        systemMsgDiv.className = 'system-message';
        systemMsgDiv.innerHTML = msg.text;
        fragment.appendChild(systemMsgDiv);
        lastSenderRef.current = 'system';
        return fragment;
    }

    if (msg.type === 'call-event') {
        const callEvDiv = document.createElement('div');
        callEvDiv.className = 'call-event-message';
        callEvDiv.dataset.id = msg.id;
        const icon = msg.callIcon || 'fa-video';
        const isRejected = icon === 'fa-phone-slash';
        const colorClass = isRejected ? 'call-event-pill--rejected' : 'call-event-pill--ended';
        const detail = msg.callDetail ? `<span class="call-event-detail">${msg.callDetail}</span>` : '';
        callEvDiv.innerHTML = `<div class="call-event-pill ${colorClass}"><i class="fas ${icon} call-event-icon"></i><span class="call-event-label">${msg.text.replace(/ · .*/, '')}</span>${detail}<button class="call-event-delete" title="删除" onclick="(function(btn){const id=btn.closest('[data-id]').dataset.id;const idx=messages.findIndex(m=>String(m.id)===String(id));if(idx>-1){messages.splice(idx,1);renderMessages();throttledSaveData();}})(this)"><i class="fas fa-times"></i></button></div>`;
        fragment.appendChild(callEvDiv);
        lastSenderRef.current = 'system';
        return fragment;
    }

    if (msg.type === 'transfer' || msg.type === 'redpacket') {
        const trDiv = document.createElement('div');
        trDiv.className = 'transfer-message';
        trDiv.dataset.id = msg.id;
        const isOut = msg.sender === 'user';
        const alignCls = isOut ? 'transfer-message--out' : 'transfer-message--in';
        let statusText, cardState, statusIcon;
        if (msg.transferClaimed === 'claimed') { statusText = '已领取'; cardState = 'claimed'; statusIcon = '✓'; }
        else if (msg.transferClaimed === 'returned') { statusText = '已退回'; cardState = 'returned'; statusIcon = '↩'; }
        else { statusText = '对方待领取'; cardState = 'pending'; statusIcon = '⏳'; }
        trDiv.innerHTML = `<div class="transfer-card ${alignCls} ${cardState}" onclick="openRedPacketModal('${msg.id}')" style="background:linear-gradient(135deg,#c4453c 0%,#a8382f 100%);color:#fff;border-radius:12px;overflow:hidden;cursor:pointer;min-width:200px;">
            <div class="transfer-card-body" style="padding:16px;display:flex;align-items:center;gap:12px;">
                <div class="transfer-envelope" style="width:40px;height:48px;background:rgba(255,215,0,0.2);border-radius:6px;display:flex;align-items:center;justify-content:center;color:#ffd700;">
                    <svg width="24" height="28" viewBox="0 0 20 28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="16" height="18" rx="2"/><path d="M2 8l8 6 8-6"/><circle cx="10" cy="14" r="2" fill="currentColor" stroke="none"/></svg>
                </div>
                <div class="transfer-card-content">
                    <div class="transfer-card-title" style="font-size:14px;font-weight:500;margin-bottom:4px;">${msg.transferNote || '恭喜发财'}</div>
                    <div class="transfer-card-note" style="font-size:12px;color:rgba(255,255,255,0.7);">微信红包</div>
                </div>
            </div>
            <div class="transfer-card-status" style="padding:8px 16px;background:rgba(0,0,0,0.15);font-size:12px;">${statusIcon} ${statusText}</div>
        </div>`;
        fragment.appendChild(trDiv);
        lastSenderRef.current = msg.sender;
        return fragment;
    }

    let showTimestamp = true;
    if (settings.timeFormat === 'off') {
        showTimestamp = false;
    } else if (nextMsg) {
        const currentTs = new Date(msg.timestamp).getTime();
        const nextTs = new Date(nextMsg.timestamp).getTime();
        if (nextMsg.sender === msg.sender && nextMsg.type !== 'system' && (nextTs - currentTs < 60000)) {
            showTimestamp = false;
        }
    }

    let isLastInSenderGroup = true;
    if (nextMsg) {
        const currentTs = new Date(msg.timestamp).getTime();
        const nextTs = new Date(nextMsg.timestamp).getTime();
        if (nextMsg.sender === msg.sender && nextMsg.type !== 'system' && (nextTs - currentTs < 60000)) {
            isLastInSenderGroup = false;
        }
    }

    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${msg.sender === 'user' ? 'sent' : 'received'}`;
    wrapper.dataset.id = msg.id;
    wrapper.dataset.msgId = msg.id;

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    if (settings.inChatAvatarPosition === 'custom' && settings.inChatAvatarCustomOffset !== undefined) {
        avatarDiv.style.marginTop = settings.inChatAvatarCustomOffset + 'px';
    }

    const groupMember = (msg.sender !== 'user' && typeof getGroupMemberForMessage === 'function') ? getGroupMemberForMessage(msg.id) : null;

    if (settings.inChatAvatarEnabled) {
        const isSameSenderGroup = groupMember && lastSenderRef.current === 'group_' + (groupMember ? groupMember.name : '');
        const isSameSenderNormal = !groupMember && msg.sender === lastSenderRef.current;
        const shouldHide = !settings.alwaysShowAvatar && (isSameSenderGroup || isSameSenderNormal);
        if (shouldHide) {
            avatarDiv.classList.add('hidden');
        } else if (groupMember) {
            const groupAvatarShape = settings.partnerAvatarShape || 'circle';
            ['circle', 'square', 'pentagon', 'heart'].forEach(s => avatarDiv.classList.remove('shape-' + s));
            if (groupAvatarShape !== 'none') avatarDiv.classList.add('shape-' + groupAvatarShape);
            if (groupMember.avatar) {
                avatarDiv.innerHTML = `<img src="${groupMember.avatar}" style="width:100%;height:100%;object-fit:cover;">`;
            } else {
                const initials = (groupMember.name || '?').charAt(0).toUpperCase();
                avatarDiv.innerHTML = `<div style="width:100%;height:100%;background:var(--accent-color);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;">${initials}</div>`;
            }
        } else {
            const isUser = msg.sender === 'user';
            const avatarElement = isUser ? DOMElements.me.avatar : DOMElements.partner.avatar;
            const frameSettings = isUser ? settings.myAvatarFrame : settings.partnerAvatarFrame;
            const avatarShape = isUser ? (settings.myAvatarShape || 'circle') : (settings.partnerAvatarShape || 'circle');
            avatarDiv.innerHTML = avatarElement.innerHTML;
            applyAvatarFrame(avatarDiv, frameSettings);
            ['circle', 'square', 'pentagon', 'heart'].forEach(s => avatarDiv.classList.remove('shape-' + s));
            if (avatarShape !== 'none') avatarDiv.classList.add('shape-' + avatarShape);
        }
    } else {
        avatarDiv.style.display = 'none';
    }
    wrapper.appendChild(avatarDiv);

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'message-content-wrapper';

    if (groupMember && groupChatSettings.showName) {
        const nameLabel = document.createElement('div');
        nameLabel.className = 'group-sender-name';
        nameLabel.textContent = groupMember.name;
        const isSameSenderGroupForName = lastSenderRef.current === 'group_' + groupMember.name;
        if (!isSameSenderGroupForName) contentWrapper.appendChild(nameLabel);
    } else if (!groupMember && msg.sender !== 'user' && msg.sender !== null && (settings.showPartnerNameInChat || showPartnerNameInChat)) {
        const isSameSenderForName = lastSenderRef.current === msg.sender;
        if (!isSameSenderForName) {
            const nameLabel = document.createElement('div');
            nameLabel.className = 'group-sender-name';
            nameLabel.textContent = settings.partnerName || msg.sender || '对方';
            contentWrapper.appendChild(nameLabel);
        }
    }

    let messageHTML = '';
    if (msg.replyTo) {
        const repliedText = msg.replyTo.text || (msg.replyTo.image ? '🖼 图片' : '[消息]');
        const repliedSender = msg.replyTo.sender === 'user' ? (settings.myName || '我') : (settings.partnerName || '对方');
        messageHTML += `<div class="reply-indicator" data-reply-id="${msg.replyTo.id || ''}" style="cursor:pointer;" onclick="scrollToQuotedMessage(this)"><span class="reply-indicator-sender">${repliedSender}</span><span class="reply-indicator-text">${repliedText}</span></div>`;
    }

    const isImageOnly = !msg.text && !!msg.image;
    // 撤回的消息显示成系统提示
    if (msg.recalled) {
        const recallLabel = msg.sender === 'user' ? '你撤回了一条消息' : '对方撤回了一条消息';
        const recallText = msg.recallText ? `（${msg.recallText}）` : '';
        const div = document.createElement('div');
        div.style.cssText = 'text-align:center;margin:10px 0;';
        div.innerHTML = `<span style="font-size:11px;color:#999;background:rgba(0,0,0,0.06);padding:4px 14px;border-radius:10px;display:inline-block;">${recallLabel}${recallText}</span>`;
        fragment.appendChild(div);
        lastSenderRef.current = msg.sender;
        return fragment;
    }
    let content = msg.text ? `<div>${msg.text.replace(/\n/g, '<br>')}</div>` : '';
    if (msg.image) content += `<img src="${msg.image}" class="message-image${isImageOnly ? ' message-image-only' : ''}" alt="图片" style="max-width:${isImageOnly ? '100px' : '100px'}; border-radius: 12px;${!isImageOnly ? ' margin-top: 6px;' : ''} cursor: pointer;" onclick="viewImage('${msg.image}')">`;
    messageHTML += content;

    const messageDiv = document.createElement('div');
    if (isImageOnly) {
        messageDiv.className = `message message-${msg.sender === 'user' ? 'sent' : 'received'} message-image-bubble-none`;
    } else {
        messageDiv.className = `message message-${msg.sender === 'user' ? 'sent' : 'received'} ${settings.bubbleStyle}`;
    }
    messageDiv.innerHTML = messageHTML;

    let actionsHTML = '';
    if (settings.replyEnabled) actionsHTML += `<button class="meta-action-btn reply-btn" title="回复"><i class="fas fa-reply"></i></button>`;
    const starIcon = msg.favorited ? 'fas fa-star' : 'far fa-star';
    actionsHTML += `<button class="meta-action-btn favorite-action-btn ${msg.favorited ? 'favorited' : ''}" title="${msg.favorited ? '取消收藏' : '收藏'}"><i class="${starIcon}"></i></button>`;
    // 自己发的消息显示撤回按钮
    if (msg.sender === 'user' && !msg.recalled) {
        actionsHTML += `<button class="meta-action-btn recall-btn" title="撤回" onclick="recallMessage(${msg.id})"><i class="fas fa-undo"></i></button>`;
    }
    actionsHTML += `<button class="meta-action-btn delete-btn" title="删除"><i class="fas fa-trash-alt"></i></button>`;
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'message-meta-actions';
    actionsDiv.innerHTML = actionsHTML;

    let metaHTML = '';
    if (showTimestamp) {
        const ts = new Date(msg.timestamp);
        let timeStr;
        const fmt = settings.timeFormat || 'HH:mm';
        if (fmt === 'HH:mm:ss') {
            timeStr = ts.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        } else if (fmt === 'h:mm AM/PM') {
            timeStr = ts.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        } else if (fmt === 'h:mm:ss AM/PM') {
            timeStr = ts.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
        } else {
            timeStr = ts.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
        }
        metaHTML += `<div class="timestamp">${timeStr}</div>`;
    }

    if (msg.sender === 'user' && settings.readReceiptsEnabled && isLastInSenderGroup) {
        const rrStyle = settings.readReceiptStyle || 'icon';
        if (rrStyle === 'text') {
            if (msg.status === 'read') {
                metaHTML += `<div class="read-receipt read" style="font-size:9px;letter-spacing:0.3px;font-weight:500;">已读</div>`;
            } else {
                metaHTML += `<div class="read-receipt" style="font-size:9px;letter-spacing:0.3px;opacity:0.5;">未读</div>`;
            }
        } else {
            const statusIcon = msg.status === 'read' ? 'fa-check-double' : 'fa-check';
            metaHTML += `<div class="read-receipt ${msg.status === 'read' ? 'read' : ''}"><i class="fas ${statusIcon}"></i></div>`;
        }
    }

    if (metaHTML !== '') {
        const metaDiv = document.createElement('div');
        metaDiv.className = 'message-meta';
        if (!showTimestamp && !metaHTML.includes('timestamp')) {
            metaDiv.style.height = 'auto';
            metaDiv.style.marginTop = '2px';
            if (settings.inChatAvatarPosition !== 'top') {
                avatarDiv.style.marginBottom = '18px';
            }
        } else {
            if (settings.inChatAvatarPosition !== 'top') {
                avatarDiv.style.marginBottom = '26px';
            }
        }
        metaDiv.innerHTML = metaHTML;
        contentWrapper.append(actionsDiv, messageDiv, metaDiv);
    } else {
        contentWrapper.append(actionsDiv, messageDiv);
    }
    wrapper.appendChild(contentWrapper);
    fragment.appendChild(wrapper);

    lastSenderRef.current = groupMember ? ('group_' + groupMember.name) : msg.sender;
    return fragment;
}

function _updateReadReceiptsDOM() {
    const container = DOMElements.chatContainer;
    const rrStyle = settings.readReceiptStyle || 'icon';
    container.querySelectorAll('.message-wrapper.sent').forEach(wrapper => {
        const receiptEl = wrapper.querySelector('.read-receipt');
        if (!receiptEl) return;
        const msgId = wrapper.dataset.msgId || wrapper.dataset.id;
        const msg = messages.find(m => String(m.id) === String(msgId));
        if (!msg || msg.status !== 'read') return;
        if (rrStyle === 'text') {
            receiptEl.classList.add('read');
            receiptEl.textContent = '已读';
            receiptEl.style.opacity = '1';
        } else {
            receiptEl.classList.add('read');
            const icon = receiptEl.querySelector('i');
            if (icon) icon.className = 'fas fa-check-double';
        }
    });
}

function renderMessages(preserveScroll = false) {
    const container = DOMElements.chatContainer;
    const totalMessages = messages.length;
    const startIndex = Math.max(0, totalMessages - displayedMessageCount);
    const msgsToRender = messages.slice(startIndex);

    const historyLoader = document.getElementById('history-loader');
    if (historyLoader) {
        historyLoader.style.display = startIndex > 0 ? 'flex' : 'none';
    }

    DOMElements.emptyState.style.display = totalMessages === 0 ? 'flex' : 'none';

    const oldScrollHeight = container.scrollHeight;
    const oldScrollTop = container.scrollTop;
    
    container.innerHTML = '';

    const fragment = new DocumentFragment();
    
    const spacer = document.createElement('div');
    spacer.style.flex = '1';
    fragment.appendChild(spacer);

    let lastSenderRef = { current: null };
    msgsToRender.forEach((msg, i) => {
        const prevMsg = i > 0 ? msgsToRender[i - 1] : (startIndex > 0 ? messages[startIndex - 1] : null);
        const nextMsg = i < msgsToRender.length - 1 ? msgsToRender[i + 1] : null;
        const msgFragment = createMessageFragment(msg, prevMsg, nextMsg, lastSenderRef);
        fragment.appendChild(msgFragment);
    });

    container.appendChild(fragment);

    if (preserveScroll) {
        const newScrollHeight = container.scrollHeight;
        container.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight);
    } else {
        requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight;
        });
    }
}

const addMessage = (message) => {
    if (!(message.timestamp instanceof Date)) message.timestamp = new Date(message.timestamp);
    
    const container = DOMElements.chatContainer;
    const wasEmpty = messages.length === 0;

    const prevMsg = messages.length > 0 ? messages[messages.length - 1] : null;
    messages.push(message);
    
    if (wasEmpty) {
        DOMElements.emptyState.style.display = 'none';
    }

    // --- Update previous message if needed ---
    const existingWrappers = container.querySelectorAll('.message-wrapper');
    const lastWrapper = existingWrappers.length > 0 ? existingWrappers[existingWrappers.length - 1] : null;
    if (lastWrapper && prevMsg) {
        const currentTs = new Date(message.timestamp).getTime();
        const prevTs = new Date(prevMsg.timestamp).getTime();

        if (message.sender === prevMsg.sender && message.type === 'normal' && prevMsg.type === 'normal' && (currentTs - prevTs < 60000)) {
            const metaEl = lastWrapper.querySelector('.message-meta');
            if (metaEl) metaEl.style.display = 'none';
            const avatarEl = lastWrapper.querySelector('.message-avatar');
            if (avatarEl) avatarEl.style.marginBottom = '';
        }
    }
    
    // --- Append new message ---
    let lastSenderRef = { current: null };
    if (prevMsg) {
        const prevGroupMember = (prevMsg.sender !== 'user' && typeof getGroupMemberForMessage === 'function') ? getGroupMemberForMessage(prevMsg.id) : null;
        lastSenderRef.current = prevGroupMember ? ('group_' + prevGroupMember.name) : prevMsg.sender;
    }
    
    const newMsgFragment = createMessageFragment(message, prevMsg, null, lastSenderRef);
    
    const spacer = container.querySelector('div[style*="flex: 1"]');
    if (spacer && spacer === container.lastElementChild) {
        spacer.before(newMsgFragment);
    } else {
        container.appendChild(newMsgFragment);
    }

    requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
    });

    throttledSaveData();

    // 陆沉发的消息偶尔自动撤回
    if (message.sender === 'partner' && typeof window._partnerAutoRecall === 'function') {
        window._partnerAutoRecall(message.id);
    }
};

        window._addCallEvent = (icon, label, detail) => {
            addMessage({
                id: Date.now() + Math.random(),
                sender: 'system',
                text: label + (detail ? ' · ' + detail : ''),
                timestamp: new Date(),
                status: 'received',
                type: 'call-event',
                callIcon: icon || 'fa-video',
                callDetail: detail || null,
                favorited: false,
                note: null,
            });
        };

        function optimizeImage(file, maxWidth = 800, quality = 0.7) {
            return new Promise((resolve, reject) => {
                if (file.size < 300 * 1024) {
                    const reader = new FileReader();
                    reader.onload = e => resolve(e.target.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                    return;
                }
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    let {
                        width,
                        height
                    } = img;
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                    URL.revokeObjectURL(img.src);
                };
                img.onerror = () => {
                    const reader = new FileReader();
                    reader.onload = e => resolve(e.target.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                    URL.revokeObjectURL(img.src);
                };
                img.src = URL.createObjectURL(file);
            });
        }

        window.updateReplyPreview = function() {
            const container = DOMElements.replyPreviewContainer;
            if (!container) return;
            if (!currentReplyTo) {
                container.innerHTML = '';
                container.style.display = 'none';
                return;
            }
            const senderName = currentReplyTo.sender === 'user' ? (settings.myName || '我') : (settings.partnerName || '对方');
            const previewText = currentReplyTo.text ? currentReplyTo.text.slice(0, 40) : '🖼 图片';
            container.style.display = 'flex';
            container.innerHTML = `
                <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:rgba(var(--accent-color-rgb),0.07);border-left:3px solid var(--accent-color);border-radius:0 8px 8px 0;width:100%;">
                    <div style="flex:1;min-width:0;">
                        <span style="font-size:11px;color:var(--accent-color);font-weight:600;">回复 ${senderName}</span>
                        <div style="font-size:12px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${previewText}</div>
                    </div>
                    <button onclick="currentReplyTo=null;window.updateReplyPreview();" style="background:none;border:none;cursor:pointer;color:var(--text-secondary);padding:2px 4px;font-size:14px;">✕</button>
                </div>`;
        };
        function updateReplyPreview() { window.updateReplyPreview(); }

        // ── 对方拍一拍核心逻辑（提取为独立函数，供随机触发和测试指令共用）──
        // 发送红包消息
        window._sendRedPacketMsg = function(amount, note, sender) {
            const msg = {
                id: Date.now(),
                sender: sender || 'user',
                type: 'redpacket',
                text: '',
                timestamp: new Date(),
                transferAmount: Number(amount).toFixed(2),
                transferNote: note || '恭喜发财',
                transferClaimed: false,
                status: 'sent'
            };
            messages.push(msg);
            renderMessages();
            throttledSaveData();
            // 对方随机领取或退回（70%领取，30%退回）
            if (sender === 'user') {
                setTimeout(function() {
                    msg.transferClaimed = Math.random() < 0.7 ? 'claimed' : 'returned';
                    renderMessages();
                    throttledSaveData();
                    if (typeof window._triggerReply === 'function') window._triggerReply();
                }, 3000);
            }
        };
        // 陆沉主动发红包
        window._partnerSendRedPacket = function() {
            var notes = ['给你的零花钱', '买点好吃的', '今天发了奖金', '别舍不得花', '请你喝奶茶', '拿着，想买什么买什么', '今天开心，给你发个红包'];
            // 有特殊含义的金额池
            var luckyAmounts = [
                5.20, 52.0, 52.00, 520.0, 520.00,
                13.14, 131.4, 1314.0,
                6.66, 66.6, 666.0, 666.00,
                8.88, 88.8, 888.0, 888.00,
                9.99, 99.9, 999.0, 999.00,
                16.8, 168.0, 18.8, 188.0,
                5.21, 52.1, 521.0, 521.00,
                20.99, 99.99, 100.0, 200.0
            ];
            var amt = luckyAmounts[Math.floor(Math.random() * luckyAmounts.length)];
            var note = notes[Math.floor(Math.random() * notes.length)];
            window._sendRedPacketMsg(amt, note, 'partner');
            // 扣陆沉余额
            if (typeof window._deductPartnerBalance === 'function') window._deductPartnerBalance(amt);
        };
        // 陆沉自动发红包定时器：每天 1~2 次，间隔 4~8 小时
        var _partnerRedPacketTimer = null;
        function schedulePartnerRedPacket() {
            if (_partnerRedPacketTimer) clearTimeout(_partnerRedPacketTimer);
            var delay = (4 + Math.random() * 4) * 60 * 60 * 1000; // 4~8小时一次
            _partnerRedPacketTimer = setTimeout(function() {
                if (typeof window._partnerSendRedPacket === 'function') {
                    window._partnerSendRedPacket();
                }
                schedulePartnerRedPacket();
            }, delay);
        }
        // 启动定时器：打开后 1 小时左右第一次触发
        setTimeout(schedulePartnerRedPacket, 60 * 60 * 1000);

        window._triggerPartnerPoke = function() {
            let pokeAction = null;

            const groups = window.customPokeGroups || [];
            const allPokes = (typeof customPokes !== 'undefined' ? customPokes : []) || [];

            const enabledGroups = groups.filter(function(g) {
                return !g.disabled && Array.isArray(g.items) && g.items.length > 0;
            });

            const groupedItems = new Set();
            enabledGroups.forEach(function(g) { g.items.forEach(function(t) { groupedItems.add(t); }); });

            const ungroupedPokes = allPokes.filter(function(t) { return !groupedItems.has(t); });

            if (enabledGroups.length > 0) {
                const pickedGroup = enabledGroups[Math.floor(Math.random() * enabledGroups.length)];
                const groupPool = pickedGroup.items.filter(function(t) { return allPokes.includes(t); });
                if (groupPool.length > 0) {
                    pokeAction = groupPool[Math.floor(Math.random() * groupPool.length)];
                }
            }

            if (!pokeAction && ungroupedPokes.length > 0) {
                pokeAction = ungroupedPokes[Math.floor(Math.random() * ungroupedPokes.length)];
            }
            if (!pokeAction && allPokes.length > 0) {
                pokeAction = allPokes[Math.floor(Math.random() * allPokes.length)];
            }
            if (!pokeAction && CONSTANTS.POKE_ACTIONS && CONSTANTS.POKE_ACTIONS.length > 0) {
                pokeAction = getRandomItem(CONSTANTS.POKE_ACTIONS);
            }
            if (!pokeAction) {
                if (typeof showNotification === 'function') showNotification('拍一拍库为空，请先添加内容', 'warning', 2500);
                return;
            }

            if (typeof window._sanitizePokeTextForDisplay === 'function') {
                pokeAction = window._sanitizePokeTextForDisplay(pokeAction);
            }
            const pokeText = (typeof window._formatPartnerPokeText === 'function')
                ? window._formatPartnerPokeText(`${settings.partnerName} ${pokeAction}`)
                : `${settings.partnerName} ${pokeAction}`;

            addMessage({ id: Date.now(), text: pokeText, timestamp: new Date(), type: 'system' });
            if (typeof playSound === 'function') playSound('partner_poke');
            (function(){try{if(window._typingIndicatorAutoHideTimer){clearTimeout(window._typingIndicatorAutoHideTimer);window._typingIndicatorAutoHideTimer=null;}}catch(e){}var _tiW=document.getElementById('typing-indicator-wrapper');if(_tiW){var _tiInner=_tiW.querySelector('.typing-indicator');if(_tiInner){_tiInner.classList.add('hiding');setTimeout(function(){_tiW.style.display='none';if(_tiInner)_tiInner.classList.remove('hiding');},240);}else{_tiW.style.display='none';}}})();
        };

        function sendMessage(textOverride = null, type = 'normal') {
            const text = textOverride || DOMElements.messageInput.value.trim();
            const imageFile = DOMElements.imageInput.files[0];
            if (!text && !imageFile && type === 'normal') return;

            // ── 斜杠指令拦截 ──
            if (text && text.startsWith('/') && type === 'normal') {
                const cmd = text.replace(/\s+/g, '').toLowerCase();
                if (cmd === '/测试拍一拍' || cmd === '/testpoke') {
                    DOMElements.messageInput.value = '';
                    DOMElements.messageInput.style.height = '46px';
                    if (typeof window._triggerPartnerPoke === 'function') window._triggerPartnerPoke();
                    if (typeof showNotification === 'function') showNotification('✦ 强制触发对方拍一拍', 'info', 1800);
                    return;
                }
                if (cmd === '/测试状态更新' || cmd === '/teststatus') {
                    DOMElements.messageInput.value = '';
                    DOMElements.messageInput.style.height = '46px';
                    if (typeof window._triggerStatusChange === 'function') window._triggerStatusChange();
                    if (typeof showNotification === 'function') showNotification('✦ 强制触发状态更新', 'info', 1800);
                    return;
                }
            }

            DOMElements.messageInput.value = '';
            DOMElements.messageInput.style.height = '46px';
            if (imageFile && imageFile.size > MAX_IMAGE_SIZE) {
                showNotification('图片大小不能超过5MB', 'error'); DOMElements.imageInput.value = ''; return;
            }

            const createMessage = (imgSrc = null) => {
                const messageData = {
                    id: Date.now(),
                    sender: 'user',
                    text: text || '',
                    timestamp: new Date(),
                    image: imgSrc,
                    status: 'sent',
                    favorited: false,
                    note: null,
                    replyTo: currentReplyTo,
                    type: type
                };
                if (type === 'system') messageData.sender = null;

                addMessage(messageData);
                if (type !== 'system') playSound('send');
                
                // 陆沉自动收藏你的聊天
                if (type === 'normal' && text && typeof window.TaPhoneApp !== 'undefined') {
                    window.TaPhoneApp.tryCollectChat(text);
                }
                currentReplyTo = null;
                updateReplyPreview();

                // 消息翻牌：约 15% 概率，陆沉"收藏"你刚发的这句
                if (type === 'normal' && text && Math.random() < 0.15) {
                    try {
                        var d = new Date();
                        var todayKey = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
                        var allFlipped = JSON.parse(localStorage.getItem('flippedMessages') || '{}');
                        if (!allFlipped[todayKey]) allFlipped[todayKey] = [];
                        allFlipped[todayKey].push({ text: text, time: d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0') });
                        localStorage.setItem('flippedMessages', JSON.stringify(allFlipped));
                        // 兼容旧的单条存储
                        localStorage.setItem('flippedMsg', JSON.stringify({ text: text, date: todayKey }));
                    } catch (e) {}
                }

if (!isBatchMode && type === 'normal') {
    const delayRange = settings.replyDelayMax - settings.replyDelayMin;
    const randomDelay = settings.replyDelayMin + Math.random() * delayRange;

    const chance = Math.max(0, Math.min(1, Number(settings.readNoReplyChance) || 0));
    const shouldIgnore = settings.allowReadNoReply && (Math.random() < chance);

    const readDelay = 1500 + Math.random() * 2500;
                setTimeout(() => {
        let changed = false;
        messages.forEach(msg => {
            if (msg.sender === 'user' && msg.status !== 'read') {
                msg.status = 'read';
                changed = true;
            }
        });
        if (changed) { _updateReadReceiptsDOM(); throttledSaveData(); }
    }, readDelay);

    if (window._pendingReplyTimer) clearTimeout(window._pendingReplyTimer);
    window._pendingReplyTimer = null;

            if (!shouldIgnore) {
        if (settings.typingIndicatorEnabled) {
            const tiWrapper = document.getElementById('typing-indicator-wrapper');
            const tiLabel = document.getElementById('typing-indicator-label');
            const tiAvatar = document.getElementById('typing-indicator-avatar');
            if (tiLabel) tiLabel.textContent = (settings.partnerName || '对方') + ' 正在输入';
            if (tiWrapper) { 
                positionTypingIndicator(); 
                tiWrapper.style.display = 'block'; 
            }
            if (tiAvatar) {
                const partnerImg = DOMElements.partner.avatar.querySelector('img');
                tiAvatar.innerHTML = partnerImg ? `<img src="${partnerImg.src}">` : '<i class="fas fa-user"></i>';
            }
            if (DOMElements.chatContainer) DOMElements.chatContainer.scrollTop = DOMElements.chatContainer.scrollHeight;
        }
        window._pendingReplyTimer = setTimeout(() => {
            window._pendingReplyTimer = null;
            simulateReply();
        }, randomDelay);
    }
}
};

            if (imageFile) {
                showNotification('正在优化图片...', 'info', 1500);
                optimizeImage(imageFile).then(createMessage).catch(() => showNotification('图片处理失败', 'error'));
            } else {
                createMessage();
            }
            DOMElements.imageInput.value = '';
        }

        function toggleBatchMode() {
            isBatchMode = !isBatchMode;
            DOMElements.batchBtn.classList.toggle('active', isBatchMode);
            DOMElements.batchBtn.title = isBatchMode ? "退出批量模式": "批量发送模式";
            DOMElements.batchPreview.style.display = isBatchMode ? 'flex': 'none';
            const placeholder = "";
            DOMElements.messageInput.placeholder = isBatchMode ? "此刻，想说的有很多很多...": (placeholder.length > 20 ? placeholder.substring(0, 20) + "...": placeholder);
            if (isBatchMode) {
                batchMessages = []; updateBatchPreview();
            }
        }

        function addToBatch(imageOverride = null) {
            const text = DOMElements.messageInput.value.trim();
            if (!text && !imageOverride) return;
            batchMessages.push({
                id: Date.now() + batchMessages.length, text: text || '', image: imageOverride || null
            });
            DOMElements.messageInput.value = ''; DOMElements.messageInput.style.height = '46px';
            updateBatchPreview();
        }

        function updateBatchPreview() {
            const previewContainer = DOMElements.batchPreview;
            let listHTML = '';
            if (batchMessages.length > 0) {
                listHTML = batchMessages.map((msg, index) => {
                    const preview = msg.image
                        ? `<img src="${msg.image}" style="height:36px;width:36px;object-fit:cover;border-radius:6px;vertical-align:middle;margin-right:6px;">`
                        : '';
                    const label = msg.text
                        ? `<span class="batch-preview-text">${msg.text}</span>`
                        : `<span class="batch-preview-text" style="color:var(--text-secondary);font-style:italic;">图片</span>`;
                    return `<div class="batch-preview-item" data-index="${index}">${preview}${label}<button class="batch-preview-edit" title="编辑"><i class="fas fa-pencil-alt"></i></button><button class="batch-preview-remove"><i class="fas fa-times"></i></button></div>`;
                }).join('');
            } else {
                listHTML = '<div style="text-align: center; color: var(--text-secondary); font-size: 14px; padding: 10px;">つ♡⊂</div>';
            }

            previewContainer.innerHTML = `
        <div class="batch-preview-title">我有很多的话想说…！</div>
        <div class="batch-actions-top" style="display:flex;gap:6px;padding:4px 10px 0;"><label style="flex:1;display:flex;align-items:center;justify-content:center;gap:5px;padding:5px 8px;background:var(--secondary-bg);border:1px solid var(--border-color);border-radius:8px;cursor:pointer;font-size:12px;color:var(--text-secondary);"><i class="fas fa-image"></i>添加图片<input type="file" accept="image/*" style="display:none;" id="batch-image-input"></label></div>
        <div class="batch-preview-list">${listHTML}</div>
        <div class="batch-actions">
        <button class="batch-action-btn batch-cancel-btn">取消</button>
        <button class="batch-action-btn batch-send-btn" ${batchMessages.length === 0 ? 'disabled': ''}>发送全部 (${batchMessages.length})</button>
        </div>`;

            const batchImgInput = document.getElementById('batch-image-input');
            if (batchImgInput) {
                batchImgInput.addEventListener('change', async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (file.size > MAX_IMAGE_SIZE) { showNotification('图片超过5MB限制', 'warning'); return; }
                    try {
                        const base64 = await optimizeImage(file, 600, 0.8);
                        addToBatch(base64);
                    } catch(err) { showNotification('图片处理失败', 'error'); }
                    e.target.value = '';
                });
            }
        }

        function sendBatchMessages() {
            if (batchMessages.length === 0) return;
            showNotification(`正在发送 ${batchMessages.length} 条消息...`, 'info', 2000);
            batchMessages.forEach((msg, index) => {
                setTimeout(() => {
                    addMessage({
                        id: Date.now() + index, sender: 'user', text: msg.text || '', image: msg.image || null, timestamp: new Date(), status: 'sent', favorited: false, type: 'normal'
                    });
                    playSound('send');
                }, index * 300);
            });
            const delayRange = settings.replyDelayMax - settings.replyDelayMin;
            const randomDelay = settings.replyDelayMin + Math.random() * delayRange;
            setTimeout(simulateReply, batchMessages.length * 300 + randomDelay);
            isBatchMode = false; batchMessages = [];
            DOMElements.batchBtn.classList.remove('active'); DOMElements.batchPreview.style.display = 'none';
            const placeholder = "";
            DOMElements.messageInput.placeholder = placeholder.length > 20 ? placeholder.substring(0, 20) + "...": placeholder;
        }

        function positionTypingIndicator() {
            var tiW = document.getElementById('typing-indicator-wrapper');
            var inputArea = document.querySelector('.input-area-wrapper');
            if (!tiW || !inputArea) return;
            var h = inputArea.offsetHeight;
            tiW.style.bottom = h + 'px';
        }
        (function() {
            var inputArea = document.querySelector('.input-area-wrapper');
            if (!inputArea) return;
            if (typeof ResizeObserver === 'undefined') {
                window.addEventListener('resize', function() {
                    var tiW = document.getElementById('typing-indicator-wrapper');
                    if (tiW && tiW.style.display !== 'none') positionTypingIndicator();
                });
                return;
            }
            var ro = new ResizeObserver(function() {
                var tiW = document.getElementById('typing-indicator-wrapper');
                if (tiW && tiW.style.display !== 'none') positionTypingIndicator();
            });
            ro.observe(inputArea);
        })();

        window.simulateReply = function() {
            function showTypingIndicator() {
                if (!settings.typingIndicatorEnabled) return;
                const tiWrapper = document.getElementById('typing-indicator-wrapper');
                const tiLabel = document.getElementById('typing-indicator-label');
                const tiAvatar = document.getElementById('typing-indicator-avatar');
                if (tiLabel) tiLabel.textContent = (settings.partnerName || '对方') + ' 正在输入';
                if (tiWrapper) { 
                    positionTypingIndicator(); 
                    tiWrapper.style.display = 'block'; 
                }
                if (tiAvatar) {
                    const partnerImg = DOMElements.partner.avatar.querySelector('img');
                    tiAvatar.innerHTML = partnerImg ? `<img src="${partnerImg.src}">` : '<i class="fas fa-user"></i>';
                }
                DOMElements.chatContainer.scrollTop = DOMElements.chatContainer.scrollHeight;
            }

            let changed = false;
            messages.forEach(msg => {
                if (msg.sender === 'user' && msg.status !== 'read') {
                    msg.status = 'read'; changed = true;
                }
            });
            if (changed) {
                _updateReadReceiptsDOM(); throttledSaveData();
            }

if (partnerPersonas && partnerPersonas.length > 0 && Math.random() < 0.3) {
                const currentPool = [
                    ...partnerPersonas
                ];
                if(currentPool.length > 0) {
                     const nextPersona = currentPool[Math.floor(Math.random() * currentPool.length)];
                     
                     settings.partnerName = nextPersona.name;
                     DOMElements.partner.name.textContent = nextPersona.name;
                     
                     if (nextPersona.avatar) {
                         updateAvatar(DOMElements.partner.avatar, nextPersona.avatar);
                         localforage.setItem(getStorageKey('partnerAvatar'), nextPersona.avatar);
                     }
                     throttledSaveData();
                }
            }
            if (Math.random() < 0.03) {
                // ── 对方拍一拍：调用提取的通用函数（同时供 /测试拍一拍 指令使用）──
                if (typeof window._triggerPartnerPoke === 'function') window._triggerPartnerPoke();
                return;
            }

            const replyCount = Math.random() < 0.75 ? 1: (Math.random() < 0.95 ? 2: 3);
            const builtinReplies = (typeof CONSTANTS !== 'undefined' && Array.isArray(CONSTANTS.REPLY_MESSAGES)) ? CONSTANTS.REPLY_MESSAGES : [];
            const hasReplies = (customReplies && customReplies.length > 0)
                || (customKaomoji && customKaomoji.length > 0)
                || builtinReplies.length > 0;
            if (!hasReplies) {
                (function(){try{if(window._typingIndicatorAutoHideTimer){clearTimeout(window._typingIndicatorAutoHideTimer);window._typingIndicatorAutoHideTimer=null;}}catch(e){}var _tiW=document.getElementById('typing-indicator-wrapper');if(_tiW){var _tiInner=_tiW.querySelector('.typing-indicator');if(_tiInner){_tiInner.classList.add('hiding');setTimeout(function(){_tiW.style.display='none';if(_tiInner)_tiInner.classList.remove('hiding');},240);}else{_tiW.style.display='none';}}})();
                showNotification('回复库为空，请先到「自定义回复」中添加内容', 'info', 3500);
                return;
            }
            const disabledItemsOnce = (() => {
                try {
                    const raw = localStorage.getItem('disabledReplyItems');
                    return raw ? new Set(JSON.parse(raw)) : new Set();
                } catch (e) { return new Set(); }
            })();
            const disabledGroupItemsOnce = new Set();
            (window.customReplyGroups || []).forEach(g => {
                if (g.disabled && Array.isArray(g.items)) g.items.forEach(item => disabledGroupItemsOnce.add(item));
            });
            // 只用你自己加的字卡和颜文字，去掉所有系统内置回复
            let replyPoolOnce = (customReplies || [])
                .filter(r => !disabledItemsOnce.has(r) && !disabledGroupItemsOnce.has(r))
                .map(r => String(r || '').trim())
                .filter(Boolean);
            if (customKaomoji && customKaomoji.length > 0) {
                replyPoolOnce = replyPoolOnce.concat(
                    customKaomoji.map(r => String(r || '').trim()).filter(Boolean)
                );
            }
            // 应用用户对内置字卡的个人覆盖（屏蔽/删除/编辑）
            try {
                const _bo = JSON.parse(localStorage.getItem('builtinOverrides') || '{}');
                replyPoolOnce = replyPoolOnce.map(r => {
                    const st = _bo[r];
                    if (!st) return r;
                    if (st.deleted || st.disabled) return null;
                    if (st.custom && st.custom.trim()) return st.custom.trim();
                    return r;
                }).filter(Boolean);
            } catch (e) {}
            if (!replyPoolOnce.length) {
                (function(){try{if(window._typingIndicatorAutoHideTimer){clearTimeout(window._typingIndicatorAutoHideTimer);window._typingIndicatorAutoHideTimer=null;}}catch(e){}var _tiW=document.getElementById('typing-indicator-wrapper');if(_tiW){var _tiInner=_tiW.querySelector('.typing-indicator');if(_tiInner){_tiInner.classList.add('hiding');setTimeout(function(){_tiW.style.display='none';if(_tiInner)_tiInner.classList.remove('hiding');},240);}else{_tiW.style.display='none';}}})();
                showNotification('回复库可用内容为空（可能被分组禁用或屏蔽），请到「自定义回复」中调整', 'info', 4000);
                return;
            }

            // 确认有可用回复后再展示“正在输入中”，避免空转
            showTypingIndicator();
            let delay = 0;
            const recentUserMsgs = settings.replyEnabled
                ? messages.filter(m => m.sender === 'user' && m.text).slice(-10)
                : [];
            for (let i = 0; i < replyCount; i++) {
                const delayRange = settings.replyDelayMax - settings.replyDelayMin;
                delay += settings.replyDelayMin + Math.random() * delayRange;
                setTimeout(() => {
                    try {
                    const replyPool = replyPoolOnce;
                    let replyText = '';
                    // 直接从你加的字卡里随机选，不用时段、天气回复
                    // 被屏蔽或无效项直接换下一个，尽量保证每次都产出可用回复
                    if (!replyText) {
                        for (let t = 0; t < 6; t++) {
                            const picked = replyPool[Math.floor(Math.random() * replyPool.length)];
                            if (picked && String(picked).trim()) {
                                replyText = String(picked).trim();
                                break;
                            }
                        }
                    }
                    if (!replyText && i === replyCount - 1) {
                        (function(){try{if(window._typingIndicatorAutoHideTimer){clearTimeout(window._typingIndicatorAutoHideTimer);window._typingIndicatorAutoHideTimer=null;}}catch(e){}var _tiW=document.getElementById('typing-indicator-wrapper');if(_tiW){var _tiInner=_tiW.querySelector('.typing-indicator');if(_tiInner){_tiInner.classList.add('hiding');setTimeout(function(){_tiW.style.display='none';if(_tiInner)_tiInner.classList.remove('hiding');},240);}else{_tiW.style.display='none';}}})();
                        return;
                    }

                    let disabledStickerItems = new Set();
                    try {
                        const raw = localStorage.getItem('disabledStickerItems');
                        if (raw) disabledStickerItems = new Set(JSON.parse(raw));
                    } catch (e) {}
                    const enabledStickerPool = (stickerLibrary || []).filter(s => !disabledStickerItems.has(s));
                    const shouldSendSticker = enabledStickerPool.length > 0 && Math.random() < 0.2;

                    let finalText = replyText;
                    let separateEmoji = null;
                    if (customEmojis && customEmojis.length > 0 && Math.random() < 0.2) {
                        const emoji = customEmojis[Math.floor(Math.random() * customEmojis.length)];
                        if (settings.emojiMixEnabled !== false) {
                            finalText = Math.random() < 0.5
                                ? emoji + ' ' + replyText
                                : replyText + ' ' + emoji;
                        } else {
                            separateEmoji = emoji;
                        }
                    }

                    addMessage({
                        id: Date.now() + i,
                        sender: settings.partnerName || '对方',
                        text: finalText,
                        timestamp: new Date(),
                        status: 'received',
                        favorited: false,
                        note: null,
                        replyTo: (i === 0 && recentUserMsgs.length > 0 && Math.random() < 0.3)
                            ? (function(){ const m = recentUserMsgs[Math.floor(Math.random() * recentUserMsgs.length)]; return { id: m.id, text: m.text, sender: m.sender }; })()
                            : null,
                        type: 'normal'
                    });
                    if (typeof window._sendPartnerNotification === 'function') {
                        window._sendPartnerNotification(settings.partnerName || '对方', finalText);
                    }
                    playSound('message');

                    if (shouldSendSticker) {
                        const randomSticker = enabledStickerPool[Math.floor(Math.random() * enabledStickerPool.length)];
                        setTimeout(() => {
                            addMessage({
                                id: Date.now() + i + 2000,
                                sender: settings.partnerName || '对方',
                                text: '',
                                timestamp: new Date(),
                                image: randomSticker,
                                status: 'received',
                                favorited: false,
                                note: null,
                                type: 'normal'
                            });
                            playSound('message');
                            if (typeof window._sendPartnerNotification === 'function') {
                                window._sendPartnerNotification(settings.partnerName || '对方', '[表情]');
                            }
                        }, 400 + Math.random() * 600);
                    }

                    if (separateEmoji) {
                        setTimeout(() => {
                            addMessage({
                                id: Date.now() + i + 1000,
                                sender: settings.partnerName || '对方',
                                text: separateEmoji,
                                timestamp: new Date(),
                                status: 'received',
                                favorited: false,
                                note: null,
                                type: 'normal'
                            });
                            playSound('message');
                        }, 300 + Math.random() * 400);
                    }

                    if (i === replyCount - 1) {
                        (function() {
                            try {
                                if (window._typingIndicatorAutoHideTimer) {
                                    clearTimeout(window._typingIndicatorAutoHideTimer);
                                    window._typingIndicatorAutoHideTimer = null;
                                }
                            } catch (e) {}
                            var _tiW = document.getElementById('typing-indicator-wrapper');
                            if (_tiW) {
                                var _tiInner = _tiW.querySelector('.typing-indicator');
                                if (_tiInner) {
                                    _tiInner.classList.add('hiding');
                                    setTimeout(function() {
                                        _tiW.style.display = 'none';
                                        if (_tiInner) _tiInner.classList.remove('hiding');
                                    }, 240);
                                } else {
                                    _tiW.style.display = 'none';
                                }
                            }
                        })();
                    }
                    } catch (e) {
                        console.error('[simulateReply] 渲染/回填出错:', e);
                        // 机制性兜底：出错时至少让“正在输入中”消失，避免假死
                        try {
                            (function(){
                                try { if (window._typingIndicatorAutoHideTimer) { clearTimeout(window._typingIndicatorAutoHideTimer); window._typingIndicatorAutoHideTimer = null; } } catch (e2) {}
                                var _tiW2 = document.getElementById('typing-indicator-wrapper');
                                if (_tiW2) _tiW2.style.display = 'none';
                            })();
                        } catch (e2) {}
                    }
                }, delay);
            }
        }

function showModal(modalElement, focusElement = null) {
            if (modalElement._hideTimeout) {
                clearTimeout(modalElement._hideTimeout);
                modalElement._hideTimeout = null;
            }
            modalElement.style.display = 'flex';
            requestAnimationFrame(() => {
                const content = modalElement.querySelector('.modal-content');
                if (content) {
                    content.style.opacity = '1';
                    content.style.transform = 'translateY(0) scale(1)';
                }
                if (focusElement) {
                    setTimeout(() => focusElement.focus(), 100);
                }
            });
        }

        function hideModal(modalElement) {
            const content = modalElement.querySelector('.modal-content');
            if (content) {
                content.style.opacity = '0';
                content.style.transform = 'translateY(20px) scale(0.95)';
            }
            if (modalElement._hideTimeout) clearTimeout(modalElement._hideTimeout);
            modalElement._hideTimeout = setTimeout(() => {
                modalElement.style.display = 'none';
            }, 300);
        }

        function viewImage(src) {
            const modal = document.createElement('div');
            modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease;touch-action:pinch-zoom;';
            modal.innerHTML = `
                <div style="position:relative;max-width:95vw;max-height:92vh;display:flex;align-items:center;justify-content:center;">
                    <img src="${src}" style="max-width:95vw;max-height:88vh;object-fit:contain;display:block;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,0.6);" draggable="false">
                    <button onclick="this.closest('[style*=fixed]').remove()" style="position:fixed;top:16px;right:16px;width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,0.15);border:1.5px solid rgba(255,255,255,0.3);color:#fff;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);z-index:10;line-height:1;">×</button>
                    <a href="${src}" download style="position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:10px 24px;background:rgba(255,255,255,0.15);border:1.5px solid rgba(255,255,255,0.3);border-radius:20px;color:#fff;font-size:13px;text-decoration:none;backdrop-filter:blur(8px);display:flex;align-items:center;gap:6px;"><i class="fas fa-download"></i> 保存图片</a>
                </div>`;
            modal.addEventListener('click', (e) => {
                if (e.target === modal || e.target.tagName === 'IMG') modal.remove();
            });
            document.body.appendChild(modal);
        }

        function exportChatHistory() {
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.55);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease;';
            overlay.innerHTML = `
                <div style="background:var(--secondary-bg);border-radius:20px;padding:24px;width:88%;max-width:360px;box-shadow:0 20px 60px rgba(0,0,0,0.4);animation:modalContentSlideIn 0.3s ease forwards;">
                    <div style="font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:6px;display:flex;align-items:center;gap:8px;">
                        <i class="fas fa-file-export" style="color:var(--accent-color);font-size:14px;"></i>选择导出内容
                    </div>
                    <div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;">勾选需要导出的数据模块</div>
                    <div style="display:flex;flex-direction:column;gap:9px;margin-bottom:20px;">
                        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 12px;border:1px solid var(--border-color);border-radius:12px;background:var(--primary-bg);font-size:13px;color:var(--text-primary);transition:border-color 0.2s;">
                            <input type="checkbox" id="_exp_msgs" checked style="accent-color:var(--accent-color);width:15px;height:15px;">
                            <i class="fas fa-comments" style="color:var(--accent-color);width:16px;text-align:center;"></i>
                            <span>聊天记录 <span style="font-size:11px;color:var(--text-secondary);">(${messages.length} 条)</span></span>
                        </label>
                        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 12px;border:1px solid var(--border-color);border-radius:12px;background:var(--primary-bg);font-size:13px;color:var(--text-primary);transition:border-color 0.2s;">
                            <input type="checkbox" id="_exp_settings" checked style="accent-color:var(--accent-color);width:15px;height:15px;">
                            <i class="fas fa-sliders-h" style="color:var(--accent-color);width:16px;text-align:center;"></i>
                            <span>外观与聊天设置</span>
                        </label>
                        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 12px;border:1px solid var(--border-color);border-radius:12px;background:var(--primary-bg);font-size:13px;color:var(--text-primary);transition:border-color 0.2s;">
                            <input type="checkbox" id="_exp_replies" style="accent-color:var(--accent-color);width:15px;height:15px;">
                            <i class="fas fa-reply" style="color:var(--accent-color);width:16px;text-align:center;"></i>
                            <span>字卡回复库</span>
                        </label>
                        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 12px;border:1px solid var(--border-color);border-radius:12px;background:var(--primary-bg);font-size:13px;color:var(--text-primary);transition:border-color 0.2s;">
                            <input type="checkbox" id="_exp_ann" style="accent-color:var(--accent-color);width:15px;height:15px;">
                            <i class="fas fa-calendar-heart" style="color:var(--accent-color);width:16px;text-align:center;"></i>
                            <span>纪念日 / 倒计时</span>
                        </label>
                        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 12px;border:1px solid var(--border-color);border-radius:12px;background:var(--primary-bg);font-size:13px;color:var(--text-primary);transition:border-color 0.2s;">
                            <input type="checkbox" id="_exp_themes" style="accent-color:var(--accent-color);width:15px;height:15px;">
                            <i class="fas fa-palette" style="color:var(--accent-color);width:16px;text-align:center;"></i>
                            <span>自定义主题配色</span>
                        </label>
                    </div>
                    <div style="display:flex;gap:10px;">
                        <button id="_exp_cancel" style="flex:1;padding:11px;border:1px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">取消</button>
                        <button id="_exp_confirm" style="flex:2;padding:11px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-family);display:flex;align-items:center;justify-content:center;gap:7px;">
                            <i class="fas fa-download"></i>确认导出
                        </button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);

            function closeDialog() { overlay.remove(); }
            overlay.addEventListener('click', e => { if (e.target === overlay) closeDialog(); });
            const _expCancelBtn = document.getElementById('_exp_cancel');
            const _expConfirmBtn = document.getElementById('_exp_confirm');
            if (_expCancelBtn) _expCancelBtn.onclick = closeDialog;

            if (_expConfirmBtn) _expConfirmBtn.onclick = function() {
                const inclMsgs     = !!document.getElementById('_exp_msgs')?.checked;
                const inclSettings = !!document.getElementById('_exp_settings')?.checked;
                const inclReplies  = !!document.getElementById('_exp_replies')?.checked;
                const inclAnn      = !!document.getElementById('_exp_ann')?.checked;
                const inclThemes   = !!document.getElementById('_exp_themes')?.checked;

                if (!inclMsgs && !inclSettings && !inclReplies && !inclAnn && !inclThemes) {
                    showNotification('请至少选择一项导出内容', 'error');
                    return;
                }
                closeDialog();

                try {
                    let dgCustomData = null, dgStatusPool = null, customWeatherMap = {};
                    if (inclSettings) {
                        try { dgCustomData = JSON.parse(localStorage.getItem('dg_custom_data') || 'null'); } catch(e2) {}
                        try { dgStatusPool = JSON.parse(localStorage.getItem('dg_status_pool') || 'null'); } catch(e2) {}
                        try {
                            Object.keys(localStorage).forEach(kk => {
                                if (kk && kk.startsWith('customWeather_')) {
                                    customWeatherMap[kk] = localStorage.getItem(kk);
                                }
                            });
                        } catch(e2) {}
                    }

                    const exportObj = {
                        version: '3.1',
                        appName: 'ChatApp',
                        exportDate: new Date().toISOString(),
                        exportModules: []
                    };
                    if (inclMsgs)     {
                        // 永远省略图片字段，只导出文字等基础信息，减小体积
                        exportObj.messages = messages.map(m => {
                            const { image, ...rest } = m;
                            return rest;
                        });
                        exportObj.exportModules.push('messages');
                    }
                    if (inclSettings) {
                        exportObj.settings = settings;
                        exportObj.exportModules.push('settings');
                        exportObj.dgCustomData = dgCustomData;
                        exportObj.dgStatusPool = dgStatusPool;
                        exportObj.customWeatherMap = customWeatherMap;
                    }
                    if (inclReplies)  {
                        exportObj.customReplies = customReplies;
                        if (customEmojis && customEmojis.length > 0) exportObj.customEmojis = customEmojis;
                        exportObj.exportModules.push('customReplies');
                    }
                    if (inclAnn)      { exportObj.anniversaries = anniversaries; exportObj.exportModules.push('anniversaries'); }
                    if (inclThemes)   {
                        exportObj.customThemes = customThemes;
                        // stickerLibrary 体积较大，这里不再随聊天备份导出
                        exportObj.exportModules.push('themes');
                    }

                    const dataStr = JSON.stringify(exportObj, null, 2);
                    const parts = exportObj.exportModules.join('+');
                    const fileName = `chat-export-${parts}-${new Date().toISOString().slice(0,10)}.json`;

                    if (navigator.share && /Mobile|Android|iPhone|iPad/.test(navigator.userAgent)) {
                        const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
                        const file = new File([blob], fileName, { type: 'application/json' });
                        if (navigator.canShare && navigator.canShare({ files: [file] })) {
                            navigator.share({ files: [file], title: 'Ysiah数据导出', text: `导出日期：${new Date().toLocaleDateString()}` })
                                .catch(() => fallbackExport(dataStr, fileName));
                            return;
                        }
                    }
                    fallbackExport(dataStr, fileName);
                } catch (error) {
                    console.error('导出失败:', error);
                    showNotification('导出失败，请重试', 'error');
                }
            };
        }

        function fallbackExport(dataStr, fileName) {
            fileName = fileName || `chat-backup-${SESSION_ID}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
            const dataBlob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 2000);
            showNotification('导出成功', 'success');
        }

        function importChatHistory(file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    let rawText = e.target.result;
                    if (rawText.charCodeAt(0) === 0xFEFF) rawText = rawText.slice(1);
                    let importedData = JSON.parse(rawText);

                    // 兼容全量备份格式（type:'full' 或含 indexedDB/localforage 字段）
                    // 将其转换为 importChatHistory 能识别的标准字段
                    if (importedData && typeof importedData === 'object' &&
                        (importedData.type === 'full' || importedData.indexedDB || importedData.localforage) &&
                        !importedData.messages && !importedData.settings) {

                        const idb = importedData.indexedDB || importedData.localforage || {};
                        const ls  = importedData.localStorage || {};
                        const allKv = Object.assign({}, idb, ls);

                        // 找到 sessionId（取第一个带 _chatMessages 的键前缀）
                        let detectedSid = null;
                        const appPfx = importedData.appPrefix || 'CHAT_APP_V3_';
                        for (const k of Object.keys(allKv)) {
                            if (k.indexOf('_chatMessages') !== -1 && k.startsWith(appPfx)) {
                                const after = k.slice(appPfx.length);
                                const u = after.indexOf('_');
                                if (u > 0) { detectedSid = after.slice(0, u); break; }
                            }
                        }

                        const pfxSid = detectedSid ? (appPfx + detectedSid + '_') : null;
                        const getVal = (suffix) => {
                            if (pfxSid) {
                                const v = allKv[pfxSid + suffix];
                                if (v !== undefined && v !== null) return v;
                            }
                            // 无前缀回退
                            return allKv[suffix] !== undefined ? allKv[suffix] : null;
                        };
                        const parseVal = (v) => {
                            if (v === null || v === undefined) return null;
                            if (typeof v !== 'string') return v;
                            try { return JSON.parse(v); } catch(e2) { return v; }
                        };

                        const converted = {
                            version: importedData.version || '3.1',
                            appName:  importedData.appName || 'ChatApp',
                            exportDate: importedData.exportDate || importedData.timestamp || new Date().toISOString(),
                            exportModules: []
                        };

                        const msgs = parseVal(getVal('chatMessages'));
                        if (Array.isArray(msgs)) { converted.messages = msgs; converted.exportModules.push('messages'); }

                        const chatSettings = parseVal(getVal('chatSettings'));
                        if (chatSettings && typeof chatSettings === 'object') {
                            converted.settings = chatSettings;
                            converted.exportModules.push('settings');
                        }
                        // 额外的 localStorage 设置字段
                        const dgCustomData = parseVal(ls['dg_custom_data'] !== undefined ? ls['dg_custom_data'] : null);
                        if (dgCustomData) converted.dgCustomData = dgCustomData;
                        const dgStatusPool = parseVal(ls['dg_status_pool'] !== undefined ? ls['dg_status_pool'] : null);
                        if (dgStatusPool) converted.dgStatusPool = dgStatusPool;
                        const customWeatherMap = {};
                        for (const wk of Object.keys(ls)) {
                            if (wk && wk.startsWith('customWeather_')) customWeatherMap[wk] = ls[wk];
                        }
                        if (Object.keys(customWeatherMap).length) converted.customWeatherMap = customWeatherMap;

                        const replies = parseVal(getVal('customReplies'));
                        if (Array.isArray(replies)) { converted.customReplies = replies; converted.exportModules.push('customReplies'); }

                        const emojis = parseVal(getVal('customEmojis'));
                        if (Array.isArray(emojis)) converted.customEmojis = emojis;

                        const ann = parseVal(getVal('anniversaries'));
                        if (Array.isArray(ann)) { converted.anniversaries = ann; converted.exportModules.push('anniversaries'); }

                        const themes = parseVal(allKv[appPfx + 'customThemes'] !== undefined ? allKv[appPfx + 'customThemes'] : (ls[appPfx + 'customThemes'] || null));
                        if (themes) { converted.customThemes = themes; converted.exportModules.push('themes'); }

                        importedData = converted;
                    }

                    const hasMessages  = importedData.messages && Array.isArray(importedData.messages);
                    const hasSettings  = !!importedData.settings;
                    const hasReplies   = importedData.customReplies && Array.isArray(importedData.customReplies);
                    const hasAnn       = importedData.anniversaries && Array.isArray(importedData.anniversaries);
                    const hasThemes    = !!importedData.customThemes || !!importedData.stickerLibrary;

                    if (!hasMessages && !hasSettings && !hasReplies && !hasAnn && !hasThemes) {
                        throw new Error('无效的聊天记录文件（未检测到可识别的数据模块）');
                    }

                    const overlay = document.createElement('div');
                    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.55);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease;';

                    const makeRow = (id, icon, label, sublabel, available, checked) => {
                        if (!available) return '';
                        return `<label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 12px;border:1px solid var(--border-color);border-radius:12px;background:var(--primary-bg);font-size:13px;color:var(--text-primary);">
                            <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} style="accent-color:var(--accent-color);width:15px;height:15px;">
                            <i class="${icon}" style="color:var(--accent-color);width:16px;text-align:center;"></i>
                            <span>${label}${sublabel ? `<span style="font-size:11px;color:var(--text-secondary);margin-left:4px;">${sublabel}</span>` : ''}</span>
                        </label>`;
                    };

                    overlay.innerHTML = `
                        <div style="background:var(--secondary-bg);border-radius:20px;padding:24px;width:88%;max-width:360px;box-shadow:0 20px 60px rgba(0,0,0,0.4);animation:modalContentSlideIn 0.3s ease forwards;">
                            <div style="font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:6px;display:flex;align-items:center;gap:8px;">
                                <i class="fas fa-file-import" style="color:var(--accent-color);font-size:14px;"></i>选择导入内容
                            </div>
                            <div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;">文件中检测到以下数据，选择要导入的模块</div>
                            <div style="display:flex;flex-direction:column;gap:9px;margin-bottom:20px;">
                                ${makeRow('_imp_msgs', 'fas fa-comments', '聊天记录', hasMessages ? `(${importedData.messages.length} 条)` : '', hasMessages, true)}
                                ${makeRow('_imp_settings', 'fas fa-sliders-h', '外观与聊天设置', '', hasSettings, true)}
                                ${makeRow('_imp_replies', 'fas fa-reply', '字卡回复库', '', hasReplies, false)}
                                ${makeRow('_imp_ann', 'fas fa-calendar-heart', '纪念日 / 倒计时', '', hasAnn, false)}
                                ${makeRow('_imp_themes', 'fas fa-palette', '自定义主题配色', '', hasThemes, false)}
                            </div>
                            <div style="display:flex;gap:10px;">
                                <button id="_imp_cancel" style="flex:1;padding:11px;border:1px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">取消</button>
                                <button id="_imp_confirm" style="flex:2;padding:11px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-family);display:flex;align-items:center;justify-content:center;gap:7px;">
                                    <i class="fas fa-upload"></i>确认导入
                                </button>
                            </div>
                        </div>`;
                    document.body.appendChild(overlay);

                    function closeDialog() { overlay.remove(); }
                    overlay.addEventListener('click', ev => { if (ev.target === overlay) closeDialog(); });
                    const _impCancelBtn = document.getElementById('_imp_cancel');
                    const _impConfirmBtn = document.getElementById('_imp_confirm');
                    if (_impCancelBtn) _impCancelBtn.onclick = closeDialog;

                    if (_impConfirmBtn) _impConfirmBtn.onclick = function() {
                        const doMsgs     = hasMessages  && !!document.getElementById('_imp_msgs')?.checked;
                        const doSettings = hasSettings  && !!document.getElementById('_imp_settings')?.checked;
                        const doReplies  = hasReplies   && !!document.getElementById('_imp_replies')?.checked;
                        const doAnn      = hasAnn       && !!document.getElementById('_imp_ann')?.checked;
                        const doThemes   = hasThemes    && !!document.getElementById('_imp_themes')?.checked;

                        if (!doMsgs && !doSettings && !doReplies && !doAnn && !doThemes) {
                            showNotification('请至少选择一项导入内容', 'error');
                            return;
                        }

                        if (doMsgs && messages.length > 0 && !confirm('导入将覆盖当前会话的聊天记录，确定继续吗？')) return;
                        closeDialog();

                        if (doMsgs) {
                            messages = importedData.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
                        }
                        if (doSettings) {
                            if (importedData.settings) {
                                Object.assign(settings, importedData.settings);
                                try {
                                    if (settings.customFontUrl) applyCustomFont(settings.customFontUrl);
                                    if (settings.customBubbleCss) applyCustomBubbleCss(settings.customBubbleCss);
                                    if (settings.customGlobalCss) applyGlobalThemeCss(settings.customGlobalCss);
                                } catch(e2) { console.warn('导入后样式应用失败', e2); }
                            }
                            if (importedData.dgCustomData) { try { localStorage.setItem('dg_custom_data', JSON.stringify(importedData.dgCustomData)); } catch(e2) {} }
                            if (importedData.dgStatusPool) { try { localStorage.setItem('dg_status_pool', JSON.stringify(importedData.dgStatusPool)); } catch(e2) {} }
                            if (importedData.customWeatherMap) { try { Object.keys(importedData.customWeatherMap).forEach(wk => localStorage.setItem(wk, importedData.customWeatherMap[wk])); } catch(e2) {} }
                        }
                        if (doReplies  && importedData.customReplies)  customReplies  = importedData.customReplies;
                        if (doReplies  && importedData.customEmojis && Array.isArray(importedData.customEmojis)) customEmojis = importedData.customEmojis;
                        if (doAnn      && importedData.anniversaries)   anniversaries  = importedData.anniversaries;
                        if (doThemes   && importedData.customThemes)    customThemes   = importedData.customThemes;
                        if (doThemes   && importedData.stickerLibrary)  stickerLibrary = importedData.stickerLibrary;

                        saveData();
                        if (doMsgs && typeof renderMessages === 'function') renderMessages();
                        if (typeof applySettings === 'function') applySettings();
                        updateUI();
                        const count = doMsgs ? `${messages.length} 条消息` : '所选数据';
                        showNotification(`成功导入${count}`, 'success');
                    };
                } catch (error) {
                    console.error('导入失败:', error);
                    showNotification('文件格式错误或已损坏', 'error');
                }
            };
            reader.onerror = () => showNotification('文件读取失败', 'error');
            reader.readAsText(file);
        }

        // ── 对方状态更新核心逻辑（提取为独立函数，供定时触发和 /测试状态更新 指令共用）──
        window._triggerStatusChange = function() {
            let newStatus = null;

            const groups = window.customStatusGroups || [];
            const allStatuses = (typeof customStatuses !== 'undefined' ? customStatuses : []) || [];

            // 只保留「启用」且「有内容」的分组，内容必须也在 allStatuses 里存在
            const enabledGroups = groups.filter(function(g) {
                return !g.disabled && Array.isArray(g.items) && g.items.length > 0;
            });

            // 收集所有在分组内的状态文本
            const groupedItems = new Set();
            enabledGroups.forEach(function(g) { g.items.forEach(function(t) { groupedItems.add(t); }); });

            // 未分组的状态
            const ungroupedStatuses = allStatuses.filter(function(t) { return !groupedItems.has(t); });

            if (enabledGroups.length > 0) {
                // 有启用分组时：随机选一个分组 → 从该分组随机选一条状态
                const pickedGroup = enabledGroups[Math.floor(Math.random() * enabledGroups.length)];
                const groupPool = pickedGroup.items.filter(function(t) { return allStatuses.includes(t); });
                if (groupPool.length > 0) {
                    newStatus = groupPool[Math.floor(Math.random() * groupPool.length)];
                }
            }

            // 分组里没找到内容时，退回到：未分组状态 → 全部 customStatuses → 内置 PARTNER_STATUSES
            if (!newStatus && ungroupedStatuses.length > 0) {
                newStatus = ungroupedStatuses[Math.floor(Math.random() * ungroupedStatuses.length)];
            }
            if (!newStatus && allStatuses.length > 0) {
                newStatus = allStatuses[Math.floor(Math.random() * allStatuses.length)];
            }
            if (!newStatus && CONSTANTS.PARTNER_STATUSES && CONSTANTS.PARTNER_STATUSES.length > 0) {
                newStatus = getRandomItem(CONSTANTS.PARTNER_STATUSES);
            }
            if (!newStatus) {
                if (typeof showNotification === 'function') showNotification('状态库为空，请先添加内容', 'warning', 2500);
                return;
            }

            settings.partnerStatus = newStatus;
            settings.lastStatusChange = Date.now();
            // 持续时长随机：20 分钟 ~ 4 小时之间，活人感
            settings.nextStatusChange = 0.33 + Math.random() * 3.67;
            DOMElements.partner.status.textContent = newStatus;
            throttledSaveData();
        };

        const checkStatusChange = () => {
            if ((Date.now() - settings.lastStatusChange) / 36e5 >= settings.nextStatusChange) {
                window._triggerStatusChange();
            }
        };



        function getStorageKey(baseKey) {
            if (!SESSION_ID) {
                console.error('[getStorageKey] SESSION_ID 尚未初始化，拒绝生成存储键:', baseKey);
                throw new Error('SESSION_ID 未初始化，存储操作已中止');
            }
            return `${APP_PREFIX}${SESSION_ID}_${baseKey}`;
        }

        async function migrateData() {
            const isMigrated = await localforage.getItem(APP_PREFIX + 'MIGRATION_V2_DONE');
            if (isMigrated) return;

            try {
                const keys = Object.keys(localStorage);
                for (const key of keys) {
                    if (key.startsWith(APP_PREFIX)) {
                        try {
                            const val = localStorage.getItem(key);
                            if (val) {
                                let dataToStore = val;
                                try {
                                    if (val.startsWith('{') || val.startsWith('[')) {
                                        dataToStore = JSON.parse(val);
                                    }
                                } catch (e) {
                                    console.warn(`迁移期间解析数据失败: ${key}，将作为原始字符串存储。`, e);
                                }
                                await localforage.setItem(key, dataToStore);
                            }
                        } catch (e) {
                            console.error(`迁移键值 ${key} 时发生错误，已跳过。`, e);
                        }
                    }
                }
                
                await localforage.setItem(APP_PREFIX + 'MIGRATION_V2_DONE', 'true');
            } catch (e) {
                console.error("数据迁移过程中发生严重错误:", e);
                showNotification('数据迁移失败，部分旧数据可能丢失', 'error');
            }
        }

window.initializeSession = async function() {
    await migrateData();

    const sessionsData = await localforage.getItem(`${APP_PREFIX}sessionList`);
    sessionList = sessionsData || [];

    const hash = window.location.hash.substring(1);
    if (hash && sessionList.some(s => s.id === hash)) {
        SESSION_ID = hash;
    } else if (sessionList.length > 0) {
        const lastId = await localforage.getItem(`${APP_PREFIX}lastSessionId`);
        SESSION_ID = lastId && sessionList.some(s => s.id === lastId) ? lastId : sessionList[0].id;
    } else {
        SESSION_ID = await createNewSession(false);
    }

    await localforage.setItem(`${APP_PREFIX}lastSessionId`, SESSION_ID);
}

document.addEventListener('DOMContentLoaded', function() {
    const chatArea = document.querySelector('.main-chat-area');
    const historyLoader = document.getElementById('history-loader');
    
    if (chatArea && historyLoader && typeof IntersectionObserver !== 'undefined') {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && messages.length > displayedMessageCount) {
                loadMoreHistory();
            }
        }, {
            root: chatArea,
            rootMargin: '200px 0px 0px 0px',
            threshold: 0.01
        });
        observer.observe(historyLoader);
    }
});

// 撤回消息功能
window.recallMessage = function(msgId) {
    const idx = messages.findIndex(m => String(m.id) === String(msgId));
    if (idx === -1) return;
    const msg = messages[idx];
    if (msg.sender !== 'user') return;
    msg.recalled = true;
    msg.recallText = msg.text; // 保存原文
    saveData();
    renderMessages();
};

// 陆沉自动撤回：发消息后偶尔撤回（10%概率）
window._partnerAutoRecall = function(msgId) {
    setTimeout(() => {
        const idx = messages.findIndex(m => String(m.id) === String(msgId));
        if (idx === -1) return;
        const msg = messages[idx];
        if (msg.sender !== 'partner') return;
        if (Math.random() > 0.1) return; // 10%概率撤回
        msg.recalled = true;
        msg.recallText = msg.text;
        saveData();
        renderMessages();
    }, 3000 + Math.random() * 5000); // 3~8秒后
};

// 开红包弹窗
window.openRedPacketModal = function(msgId) {
    const msg = messages.find(m => String(m.id) === String(msgId));
    if (!msg) return;

    // 移除已有的弹窗
    const oldModal = document.getElementById('red-packet-modal');
    if (oldModal) oldModal.remove();

    const overlay = document.createElement('div');
    overlay.id = 'red-packet-modal';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    const isClaimed = msg.transferClaimed === 'claimed';
    const isReturned = msg.transferClaimed === 'returned';
    const isPending = !isClaimed && !isReturned;

    const senderName = msg.sender === 'user' ? (settings.myName || '我') : (settings.partnerName || '陆沉');

    overlay.innerHTML = `
        <div style="width:280px;background:linear-gradient(180deg,#c4453c 0%,#a8382f 100%);border-radius:16px;overflow:hidden;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
            <!-- 顶部金色装饰线 -->
            <div style="height:3px;background:linear-gradient(90deg,transparent,#ffd700 20%,#ffd700 80%,transparent);"></div>
            
            <div style="padding:30px 20px 20px;text-align:center;color:#fff;">
                <div style="font-size:14px;opacity:0.9;margin-bottom:10px;">${senderName} 发来的红包</div>
                <div style="font-size:18px;font-weight:600;color:#ffd700;margin-bottom:30px;">${msg.transferNote || '恭喜发财'}</div>
                
                ${isPending ? `
                    <button onclick="claimRedPacket('${msgId}')" style="width:80px;height:80px;border-radius:50%;background:#ffd700;color:#c4453c;font-size:24px;font-weight:700;border:none;cursor:pointer;box-shadow:0 4px 20px rgba(255,215,0,0.4);transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">開</button>
                ` : isClaimed ? `
                    <div style="padding:20px 0;">
                        <div style="font-size:16px;margin-bottom:8px;">已领取</div>
                        <div style="font-size:28px;font-weight:700;color:#ffd700;">¥${msg.transferAmount || '5.20'}</div>
                    </div>
                ` : `
                    <div style="padding:20px 0;font-size:16px;opacity:0.7;">红包已过期退回</div>
                `}
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
};

// 领取红包
window.claimRedPacket = function(msgId) {
    const msg = messages.find(m => String(m.id) === String(msgId));
    if (!msg) return;
    
    msg.transferClaimed = 'claimed';
    saveData();
    renderMessages();
    
    // 关闭弹窗
    const modal = document.getElementById('red-packet-modal');
    if (modal) modal.remove();
};

// 发红包弹窗（底部弹出）
window.openRedPacketSendModal = function() {
    // 移除已有的弹窗
    const oldModal = document.getElementById('red-packet-send-modal');
    if (oldModal) oldModal.remove();

    const overlay = document.createElement('div');
    overlay.id = 'red-packet-send-modal';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:flex-end;justify-content:center;';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    overlay.innerHTML = `
        <div style="width:100%;max-width:420px;background:#fff;border-radius:20px 20px 0 0;padding:20px;animation:slideUp 0.3s ease;">
            <div style="width:36px;height:4px;border-radius:2px;background:#e8e8e8;margin:0 auto 20px;"></div>
            <div style="font-size:17px;font-weight:600;text-align:center;margin-bottom:24px;">发红包</div>
            
            <!-- 金额输入 -->
            <div style="text-align:center;margin-bottom:24px;">
                <div style="display:flex;align-items:baseline;justify-content:center;gap:4px;">
                    <span style="font-size:28px;font-weight:500;">¥</span>
                    <input type="number" id="rp-amount" placeholder="0.00" step="0.01" min="0.01" style="width:160px;font-size:42px;font-weight:700;border:none;outline:none;text-align:center;border-bottom:2px solid #e8e8e8;padding-bottom:4px;" />
                </div>
            </div>
            
            <!-- 留言输入 -->
            <input type="text" id="rp-message" placeholder="恭喜发财" maxlength="20" style="width:100%;height:44px;border:1.5px solid #e8e8e8;border-radius:12px;padding:0 14px;font-size:14px;outline:none;box-sizing:border-box;margin-bottom:16px;" />
            
            <!-- 快捷留言 -->
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px;">
                <span class="rp-quick-msg" data-msg="恭喜发财" style="padding:6px 14px;border-radius:16px;border:1px solid #e8e8e8;background:#f5f5f5;font-size:12px;cursor:pointer;">恭喜发财</span>
                <span class="rp-quick-msg" data-msg="大吉大利" style="padding:6px 14px;border-radius:16px;border:1px solid #e8e8e8;background:#f5f5f5;font-size:12px;cursor:pointer;">大吉大利</span>
                <span class="rp-quick-msg" data-msg="好运连连" style="padding:6px 14px;border-radius:16px;border:1px solid #e8e8e8;background:#f5f5f5;font-size:12px;cursor:pointer;">好运连连</span>
                <span class="rp-quick-msg" data-msg="买杯奶茶" style="padding:6px 14px;border-radius:16px;border:1px solid #e8e8e8;background:#f5f5f5;font-size:12px;cursor:pointer;">买杯奶茶</span>
                <span class="rp-quick-msg" data-msg="辛苦了~" style="padding:6px 14px;border-radius:16px;border:1px solid #e8e8e8;background:#f5f5f5;font-size:12px;cursor:pointer;">辛苦了~</span>
            </div>
            
            <!-- 发送按钮 -->
            <button id="rp-send-btn" style="width:100%;height:48px;border:none;border-radius:12px;background:#c4453c;color:#fff;font-size:16px;font-weight:600;cursor:pointer;">发送红包</button>
        </div>
    `;

    document.body.appendChild(overlay);

    // 快捷留言点击
    overlay.querySelectorAll('.rp-quick-msg').forEach(span => {
        span.onclick = function() {
            document.getElementById('rp-message').value = this.dataset.msg;
        };
    });

    // 发送按钮
    document.getElementById('rp-send-btn').onclick = function() {
        const amount = parseFloat(document.getElementById('rp-amount').value);
        const message = document.getElementById('rp-message').value.trim() || '恭喜发财';
        
        if (!amount || amount <= 0) {
            alert('请输入正确的金额');
            return;
        }

        // 发送红包消息
        if (typeof window._sendRedPacketMsg === 'function') {
            window._sendRedPacketMsg(amount, message, 'user');
        }

        // 关闭弹窗
        overlay.remove();
    };
};

// 获取陆沉头像
window.getPartnerAvatar = function() {
    try {
        if (typeof DOMElements !== 'undefined' && DOMElements.partner && DOMElements.partner.avatar) {
            const img = DOMElements.partner.avatar.querySelector('img');
            if (img && img.src) return img.src;
        }
    } catch (e) {}
    return '';
};

// 模拟陆沉主动来电
window.scheduleIncomingCall = function() {
    // 随机 15分钟到 1小时后来电
    const delay = (15 + Math.random() * 45) * 60 * 1000;
    setTimeout(function() {
        // 如果当前没有通话（包括正在通话窗口、最小化悬浮窗、来电界面），就弹出来电
        const hasCall = document.getElementById('incoming-call-overlay') 
            || document.getElementById('call-window')
            || document.getElementById('call-mini-window');
        if (!hasCall && Math.random() < 0.25) {
            window.showIncomingCall();
        }
        // 安排下一次来电
        window.scheduleIncomingCall();
    }, delay);
};

// 用户主动打电话给陆沉
window.userCallPartner = function() {
    // 如果已经在通话中，就恢复通话窗口
    const miniWindow = document.getElementById('call-mini-window');
    const callWindow = document.getElementById('call-window');
    if (miniWindow || callWindow) {
        if (miniWindow) restoreCall();
        return;
    }

    const partnerAvatar = window.getPartnerAvatar();
    window.callSeconds = 0;

    // 创建通话窗口
    const callWindowEl = document.createElement('div');
    callWindowEl.id = 'call-window';
    callWindowEl.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:300px;height:450px;background:linear-gradient(155deg,#0d1b2a 0%,#1b263b 50%,#415a77 100%);border-radius:24px;overflow:hidden;z-index:10000;box-shadow:0 20px 60px rgba(0,0,0,0.5);display:flex;flex-direction:column;cursor:grab;';

    callWindowEl.innerHTML = `
        <div style="position:absolute;top:-25px;left:-25px;width:130px;height:130px;border-radius:50%;background:var(--accent-color,#9C3D2E);filter:blur(44px);opacity:0.28;animation:orbFloat 18s linear infinite;pointer-events:none;"></div>
        <div style="position:absolute;bottom:10px;right:-10px;width:90px;height:90px;border-radius:50%;background:#4a90d9;filter:blur(44px);opacity:0.28;animation:orbFloat 23s linear infinite -9s;pointer-events:none;"></div>
        <div style="position:absolute;top:40%;left:45%;width:70px;height:70px;border-radius:50%;background:#9b59b6;filter:blur(44px);opacity:0.28;animation:orbFloat 28s linear infinite -14s;pointer-events:none;"></div>
        
        <div style="padding:20px;text-align:center;color:#fff;position:relative;z-index:10;">
            <div style="font-size:18px;font-weight:600;margin-bottom:4px;">陆沉</div>
            <div style="font-size:12px;opacity:0.6;" id="call-timer">正在呼叫...</div>
        </div>
        
        <div style="flex:1;display:flex;align-items:center;justify-content:center;position:relative;z-index:10;">
            <div style="position:relative;width:100px;height:100px;">
                <div style="position:absolute;top:-10px;left:-10px;right:-10px;bottom:-10px;border-radius:50%;border:1.5px solid rgba(255,255,255,0.22);animation:avatarPulse 2.5s ease-in-out infinite;pointer-events:none;"></div>
                <div style="position:absolute;top:-18px;left:-18px;right:-18px;bottom:-18px;border-radius:50%;border:1px solid rgba(255,255,255,0.09);animation:avatarPulse 2.5s ease-in-out infinite 0.65s;pointer-events:none;"></div>
                <div style="width:100px;height:100px;border-radius:50%;overflow:hidden;border:2.5px solid rgba(255,255,255,0.28);background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;box-shadow:0 6px 22px rgba(0,0,0,0.4);">
                    ${partnerAvatar 
                        ? `<img src="${partnerAvatar}" style="width:100%;height:100%;object-fit:cover;">` 
                        : `<i class="fas fa-user" style="font-size:40px;color:rgba(255,255,255,0.8);"></i>`
                    }
                </div>
            </div>
        </div>
        
        <div style="display:flex;align-items:center;gap:6px;height:18px;justify-content:center;position:relative;z-index:10;">
            <div class="call-conn-dots" style="display:flex;gap:6px;">
                <span style="width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,0.5);animation:connDot 0.9s ease-in-out infinite;"></span>
                <span style="width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,0.5);animation:connDot 0.9s ease-in-out infinite 0.15s;"></span>
                <span style="width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,0.5);animation:connDot 0.9s ease-in-out infinite 0.3s;"></span>
            </div>
        </div>
        
        <div style="padding:30px 40px 40px;display:flex;justify-content:space-around;position:relative;z-index:10;">
            <button onclick="endCall()" style="width:56px;height:56px;border-radius:50%;border:none;background:linear-gradient(135deg,#ff5252,#c62828);color:#fff;font-size:20px;cursor:pointer;box-shadow:0 6px 20px rgba(255,82,82,0.5);">
                <i class="fas fa-phone-slash"></i>
            </button>
        </div>
        
        <style>
            @keyframes orbFloat {
                0% { transform: translate(0,0) rotate(0deg); }
                33% { transform: translate(18px,-14px) rotate(120deg); }
                66% { transform: translate(-10px,18px) rotate(240deg); }
                100% { transform: translate(0,0) rotate(360deg); }
            }
            @keyframes avatarPulse {
                0%,100% { opacity:0.6; transform:scale(1); }
                50% { opacity:0.12; transform:scale(1.14); }
            }
            @keyframes connDot {
                0%,80%,100% { transform:scale(0.72); opacity:0.3; }
                40% { transform:scale(1.22); opacity:1; }
            }
        </style>
    `;

    document.body.appendChild(callWindowEl);

    // 随机未接听：35%概率没接通
    const willReject = Math.random() < 0.35;
    const rejectDelay = 4000 + Math.random() * 8000; // 4-12秒后结果

    if (willReject) {
        setTimeout(function() {
            callWindowEl.remove();
            const rejectLabels = [
                '陆沉未接听',
                '陆沉正在忙，无法接听',
                '陆沉拒绝了通话',
                '陆沉暂时无法接听',
            ];
            const label = rejectLabels[Math.floor(Math.random() * rejectLabels.length)];
            if (typeof showNotification === 'function') {
                showNotification(label, 'info', 3000);
            }
            if (window.callTimerInterval) clearInterval(window.callTimerInterval);
        }, rejectDelay);
    } else {
        // 接通了，开始通话
        setTimeout(function() {
            const timerEl = document.getElementById('call-timer');
            if (timerEl) timerEl.textContent = '00:00';
            window.callSeconds = 0;
            
            // 声波动画已删除
            // const waveEl = document.createElement('div');
            // waveEl.style.cssText = 'display:flex;align-items:center;gap:3px;height:18px;justify-content:center;position:relative;z-index:10;';
            // waveEl.innerHTML = `
            //     <span style="width:3px;border-radius:3px;background:rgba(255,255,255,0.5);animation:waveAnim 0.85s ease-in-out infinite;height:6px;"></span>
            //     <span style="width:3px;border-radius:3px;background:rgba(255,255,255,0.5);animation:waveAnim 0.85s ease-in-out infinite 0.1s;height:13px;"></span>
            //     <span style="width:3px;border-radius:3px;background:rgba(255,255,255,0.5);animation:waveAnim 0.85s ease-in-out infinite 0.2s;height:18px;"></span>
            //     <span style="width:3px;border-radius:3px;background:rgba(255,255,255,0.5);animation:waveAnim 0.85s ease-in-out infinite 0.3s;height:13px;"></span>
            //     <span style="width:3px;border-radius:3px;background:rgba(255,255,255,0.5);animation:waveAnim 0.85s ease-in-out infinite 0.4s;height:6px;"></span>
            // `;
            // callWindowEl.insertBefore(waveEl, callWindowEl.children[callWindowEl.children.length - 1]);
            
            // 加最小化按钮
            const minimizeBtn = document.createElement('button');
            minimizeBtn.onclick = minimizeCall;
            minimizeBtn.style.cssText = 'position:absolute;top:16px;right:16px;width:28px;height:28px;border-radius:50%;border:none;background:rgba(255,255,255,0.15);color:#fff;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;z-index:11;';
            minimizeBtn.innerHTML = '<i class="fas fa-minus"></i>';
            callWindowEl.appendChild(minimizeBtn);
            
            // 通话计时器
            if (window.callTimerInterval) clearInterval(window.callTimerInterval);
            window.callTimerInterval = setInterval(function() {
                window.callSeconds++;
                const secs = window.callSeconds;
                const mins = Math.floor(secs / 60).toString().padStart(2, '0');
                const ss = (secs % 60).toString().padStart(2, '0');
                const timeStr = `${mins}:${ss}`;
                const timerEl2 = document.getElementById('call-timer');
                if (timerEl2) timerEl2.textContent = timeStr;
                const miniTimerEl = document.getElementById('call-mini-timer');
                if (miniTimerEl) miniTimerEl.textContent = timeStr;
            }, 1000);
        }, 1400 + Math.random() * 1400);
    }

    // 窗口拖动
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    callWindowEl.onmousedown = function(e) {
        if (e.target.tagName === 'BUTTON') return;
        isDragging = true;
        const rect = callWindowEl.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        callWindowEl.style.transform = 'none';
        callWindowEl.style.right = 'auto';
        callWindowEl.style.bottom = 'auto';
        
        document.onmousemove = function(ev) {
            if (isDragging) {
                callWindowEl.style.left = (ev.clientX - dragOffsetX) + 'px';
                callWindowEl.style.top = (ev.clientY - dragOffsetY) + 'px';
            }
        };
        
        document.onmouseup = function() {
            isDragging = false;
            document.onmousemove = null;
            document.onmouseup = null;
        };
    };
};

// 来电界面
window.showIncomingCall = function() {
    // 移除已有的来电界面
    const oldCall = document.getElementById('incoming-call-overlay');
    if (oldCall) oldCall.remove();

    const partnerAvatar = window.getPartnerAvatar();

    const overlay = document.createElement('div');
    overlay.id = 'incoming-call-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);backdrop-filter:blur(20px);z-index:10000;display:flex;align-items:center;justify-content:center;';

    overlay.innerHTML = `
        <div style="width:280px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:32px;padding:44px 28px 36px;display:flex;flex-direction:column;align-items:center;gap:8px;color:#fff;box-shadow:0 32px 80px rgba(0,0,0,0.5);">
            <!-- 头像和波纹动画 -->
            <div style="position:relative;margin-bottom:16px;width:88px;height:88px;">
                <div style="position:absolute;top:-12px;left:-12px;right:-12px;bottom:-12px;border-radius:50%;border:1.5px solid rgba(255,255,255,0.18);animation:ripple 2.2s ease-in-out infinite;"></div>
                <div style="position:absolute;top:-22px;left:-22px;right:-22px;bottom:-22px;border-radius:50%;border:1.5px solid rgba(255,255,255,0.08);animation:ripple 2.2s ease-in-out infinite 0.65s;"></div>
                <div style="position:absolute;inset:0;border-radius:50%;overflow:hidden;border:2px solid rgba(255,255,255,0.25);box-shadow:0 8px 28px rgba(0,0,0,0.36);background:var(--accent-color,#9C3D2E);display:flex;align-items:center;justify-content:center;">
                    ${partnerAvatar 
                        ? `<img src="${partnerAvatar}" style="width:100%;height:100%;object-fit:cover;">` 
                        : `<i class="fas fa-user" style="font-size:34px;color:rgba(255,255,255,0.85);"></i>`
                    }
                </div>
            </div>
            
            <div style="font-size:22px;font-weight:700;margin-top:4px;">陆沉</div>
            <div style="font-size:12.5px;color:rgba(255,255,255,0.48);display:flex;align-items:center;gap:6px;">
                <span style="width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.48);animation:blink 1.1s step-end infinite;"></span>
                邀请您进行视频通话
            </div>
            
            <div style="display:flex;gap:44px;margin-top:26px;">
                <!-- 拒绝按钮 -->
                <button onclick="rejectCall()" style="display:flex;flex-direction:column;align-items:center;gap:7px;background:none;border:none;cursor:pointer;color:#fff;">
                    <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#ff5252,#c62828);box-shadow:0 6px 20px rgba(255,82,82,0.45);display:flex;align-items:center;justify-content:center;transition:transform 0.18s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                        <i class="fas fa-phone-slash" style="font-size:24px;transform:rotate(135deg);"></i>
                    </div>
                    <span style="font-size:12px;color:rgba(255,255,255,0.48);font-weight:500;">拒绝</span>
                </button>
                
                <!-- 接听按钮 -->
                <button onclick="acceptCall()" style="display:flex;flex-direction:column;align-items:center;gap:7px;background:none;border:none;cursor:pointer;color:#fff;">
                    <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#4caf50,#2e7d32);box-shadow:0 6px 20px rgba(76,175,80,0.45);display:flex;align-items:center;justify-content:center;transition:transform 0.18s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                        <i class="fas fa-phone" style="font-size:24px;"></i>
                    </div>
                    <span style="font-size:12px;color:rgba(255,255,255,0.48);font-weight:500;">接听</span>
                </button>
            </div>
        </div>
        
        <style>
            @keyframes ripple {
                0% { transform: scale(0.95); opacity: 1; }
                100% { transform: scale(1.1); opacity: 0; }
            }
            @keyframes blink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0; }
            }
        </style>
    `;

    document.body.appendChild(overlay);

    // 来电60秒不接自动消失
    if (window.incomingCallTimeout) clearTimeout(window.incomingCallTimeout);
    window.incomingCallTimeout = setTimeout(function() {
        if (overlay.parentNode) {
            overlay.remove();
            if (typeof showNotification === 'function') {
                showNotification('陆沉的来电已结束', 'info', 2000);
            }
        }
    }, 60000);
};

// 拒绝通话
window.rejectCall = function() {
    const overlay = document.getElementById('incoming-call-overlay');
    if (overlay) overlay.remove();
    if (window.incomingCallTimeout) clearTimeout(window.incomingCallTimeout);
};

// 接听通话
window.acceptCall = function() {
    const overlay = document.getElementById('incoming-call-overlay');
    if (overlay) overlay.remove();
    if (window.incomingCallTimeout) clearTimeout(window.incomingCallTimeout);

    const partnerAvatar = window.getPartnerAvatar();
    window.callSeconds = 0;

    // 移除已有的通话窗口
    const oldCallWindow = document.getElementById('call-window');
    if (oldCallWindow) oldCallWindow.remove();

    // 读取上次保存的位置
    let savedPos = null;
    try {
        savedPos = JSON.parse(localStorage.getItem('callWindowPos') || 'null');
    } catch(e) {}

    const callWindow = document.createElement('div');
    callWindow.id = 'call-window';
    callWindow.style.cssText = 'position:fixed;width:300px;height:450px;background:linear-gradient(155deg,#0d1b2a 0%,#1b263b 50%,#415a77 100%);border-radius:24px;overflow:hidden;z-index:10000;box-shadow:0 20px 60px rgba(0,0,0,0.5);display:flex;flex-direction:column;cursor:grab;';
    
    // 应用保存的位置
    if (savedPos) {
        callWindow.style.left = savedPos.x + 'px';
        callWindow.style.top = savedPos.y + 'px';
        callWindow.style.right = 'auto';
        callWindow.style.bottom = 'auto';
    } else {
        callWindow.style.top = '50%';
        callWindow.style.left = '50%';
        callWindow.style.transform = 'translate(-50%,-50%)';
    }

    callWindow.innerHTML = `
        <!-- 浮动光斑动画 -->
        <div style="position:absolute;top:-25px;left:-25px;width:130px;height:130px;border-radius:50%;background:var(--accent-color,#9C3D2E);filter:blur(44px);opacity:0.28;animation:orbFloat 18s linear infinite;pointer-events:none;"></div>
        <div style="position:absolute;bottom:10px;right:-10px;width:90px;height:90px;border-radius:50%;background:#4a90d9;filter:blur(44px);opacity:0.28;animation:orbFloat 23s linear infinite -9s;pointer-events:none;"></div>
        <div style="position:absolute;top:40%;left:45%;width:70px;height:70px;border-radius:50%;background:#9b59b6;filter:blur(44px);opacity:0.28;animation:orbFloat 28s linear infinite -14s;pointer-events:none;"></div>
        
        <!-- 顶部信息栏 -->
        <div style="padding:12px 12px 6px;display:flex;justify-content:space-between;align-items:center;position:relative;z-index:10;color:#fff;flex-shrink:0;">
            <div style="display:flex;align-items:center;gap:5px;background:rgba(0,0,0,0.32);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.1);padding:4px 10px;border-radius:20px;">
                <span style="width:6px;height:6px;border-radius:50%;background:#4caf50;box-shadow:0 0 6px #4caf50;flex-shrink:0;"></span>
                <span id="call-timer" style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:rgba(255,255,255,0.92);font-variant-numeric:tabular-nums;">00:00</span>
            </div>
            <div style="display:flex;gap:3px;">
                <button onclick="minimizeCall()" style="width:26px;height:26px;border-radius:50%;border:none;background:rgba(255,255,255,0.12);backdrop-filter:blur(6px);color:rgba(255,255,255,0.75);cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center;transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.22)';this.style.transform='scale(1.08)'" onmouseout="this.style.background='rgba(255,255,255,0.12)';this.style.transform='scale(1)'">
                    <i class="fas fa-minus"></i>
                </button>
                <button style="width:26px;height:26px;border-radius:50%;border:none;background:rgba(255,255,255,0.12);backdrop-filter:blur(6px);color:rgba(255,255,255,0.75);cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center;transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.22)';this.style.transform='scale(1.08)'" onmouseout="this.style.background='rgba(255,255,255,0.12)';this.style.transform='scale(1)'">
                    <i class="fas fa-video"></i>
                </button>
            </div>
        </div>
        
        <!-- 中间内容区域 -->
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;z-index:10;gap:12px;padding:4px 12px;">
            <div style="position:relative;width:90px;height:90px;flex-shrink:0;">
                <div style="position:absolute;top:-12px;left:-12px;right:-12px;bottom:-12px;border-radius:50%;border:1.5px solid rgba(255,255,255,0.22);animation:avatarPulse 2.5s ease-in-out infinite;pointer-events:none;"></div>
                <div style="position:absolute;top:-22px;left:-22px;right:-22px;bottom:-22px;border-radius:50%;border:1px solid rgba(255,255,255,0.09);animation:avatarPulse 2.5s ease-in-out infinite 0.65s;pointer-events:none;"></div>
                <div style="width:90px;height:90px;border-radius:50%;overflow:hidden;border:3px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;box-shadow:0 6px 22px rgba(0,0,0,0.4);position:relative;z-index:1;">
                    ${partnerAvatar 
                        ? `<img src="${partnerAvatar}" style="width:100%;height:100%;object-fit:cover;">` 
                        : `<i class="fas fa-user" style="font-size:36px;color:rgba(255,255,255,0.82);"></i>`
                    }
                </div>
            </div>
            
            <div style="font-size:20px;font-weight:600;color:rgba(255,255,255,0.95);">陆沉</div>
        </div>
        
        <!-- 底部按钮区域 -->
        <div style="padding:0 30px 30px;display:flex;justify-content:space-between;align-items:center;position:relative;z-index:10;flex-shrink:0;">
            <button style="width:44px;height:44px;border-radius:50%;border:none;background:rgba(255,255,255,0.12);backdrop-filter:blur(6px);color:rgba(255,255,255,0.75);cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.22)'" onmouseout="this.style.background='rgba(255,255,255,0.12)'">
                <i class="fas fa-microphone-slash"></i>
            </button>
            <button onclick="endCall()" style="width:60px;height:60px;border-radius:50%;border:none;background:linear-gradient(135deg,#ff5252,#c62828);color:#fff;font-size:22px;cursor:pointer;box-shadow:0 6px 20px rgba(255,82,82,0.5);display:flex;align-items:center;justify-content:center;transition:transform 0.18s;" onmouseover="this.style.transform='scale(1.08)'" onmouseout="this.style.transform='scale(1)'">
                <i class="fas fa-phone-slash"></i>
            </button>
            <button style="width:44px;height:44px;border-radius:50%;border:none;background:rgba(255,255,255,0.12);backdrop-filter:blur(6px);color:rgba(255,255,255,0.75);cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.22)'" onmouseout="this.style.background='rgba(255,255,255,0.12)'">
                <i class="fas fa-image"></i>
            </button>
        </div>
        
        <!-- 动画样式 -->
        <style>
            @keyframes orbFloat {
                0% { transform: translate(0,0) rotate(0deg); }
                33% { transform: translate(18px,-14px) rotate(120deg); }
                66% { transform: translate(-10px,18px) rotate(240deg); }
                100% { transform: translate(0,0) rotate(360deg); }
            }
            @keyframes avatarPulse {
                0%,100% { opacity:0.6; transform:scale(1); }
                50% { opacity:0.12; transform:scale(1.14); }
            }
            @keyframes waveAnim {
                0%,100% { transform:scaleY(0.4); }
                50% { transform:scaleY(1); }
            }
        </style>
    `;

    document.body.appendChild(callWindow);

    // 通话窗口拖动
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    callWindow.onmousedown = function(e) {
        if (e.target.tagName === 'BUTTON') return;
        isDragging = true;
        const rect = callWindow.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        callWindow.style.transform = 'none';
        callWindow.style.right = 'auto';
        callWindow.style.bottom = 'auto';
        
        document.onmousemove = function(ev) {
            if (isDragging) {
                callWindow.style.left = (ev.clientX - dragOffsetX) + 'px';
                callWindow.style.top = (ev.clientY - dragOffsetY) + 'px';
            }
        };
        
        document.onmouseup = function() {
            isDragging = false;
            document.onmousemove = null;
            document.onmouseup = null;
            // 保存位置
            const rect = callWindow.getBoundingClientRect();
            localStorage.setItem('callWindowPos', JSON.stringify({ x: rect.left, y: rect.top }));
        };
    };

    // 先显示连接中，1.4秒后进入通话
    setTimeout(function() {
        const timerEl = document.getElementById('call-timer');
        if (timerEl) timerEl.textContent = '00:00';
        const waveEl = callWindow.querySelector('div[style*="display:flex;align-items:center;gap:3px;height:18px"]');
        if (waveEl) waveEl.style.opacity = '1';
    }, 1400);

    // 通话计时器
    if (window.callTimerInterval) clearInterval(window.callTimerInterval);
    window.callTimerInterval = setInterval(function() {
        window.callSeconds++;
        const secs = window.callSeconds;
        const mins = Math.floor(secs / 60).toString().padStart(2, '0');
        const ss = (secs % 60).toString().padStart(2, '0');
        const timeStr = `${mins}:${ss}`;
        const timerEl = document.getElementById('call-timer');
        if (timerEl && timerEl.textContent !== '连接中...') timerEl.textContent = timeStr;
        const miniTimerEl = document.getElementById('call-mini-timer');
        if (miniTimerEl) miniTimerEl.textContent = timeStr;
    }, 1000);
};

// 结束通话
window.endCall = function() {
    const callWindow = document.getElementById('call-window');
    if (callWindow) callWindow.remove();
    const miniWindow = document.getElementById('call-mini-window');
    if (miniWindow) miniWindow.remove();
    
    // 保存通话记录到通讯记录
    if (window.callSeconds > 0 && typeof window.addCallLog === 'function') {
        window.addCallLog(window.callSeconds);
    }
    
    if (window.callTimerInterval) clearInterval(window.callTimerInterval);
    window.callSeconds = 0;
};

// 最小化通话窗口
window.minimizeCall = function() {
    const callWindow = document.getElementById('call-window');
    if (callWindow) callWindow.remove();

    const partnerAvatar = window.getPartnerAvatar();

    // 创建药丸形状的悬浮窗
    const miniWindow = document.createElement('div');
    miniWindow.id = 'call-mini-window';
    miniWindow.style.cssText = 'position:fixed;z-index:10000;display:flex;align-items:center;gap:9px;background:rgba(10,18,38,0.92);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.12);border-radius:30px;padding:8px 14px 8px 10px;box-shadow:0 8px 28px rgba(0,0,0,0.4);cursor:grab;color:#fff;user-select:none;';
    
    // 读取上次保存的小窗口位置
    let savedMiniPos = null;
    try {
        savedMiniPos = JSON.parse(localStorage.getItem('callMiniPos') || 'null');
    } catch(e) {}
    if (savedMiniPos) {
        miniWindow.style.left = savedMiniPos.x + 'px';
        miniWindow.style.top = savedMiniPos.y + 'px';
        miniWindow.style.right = 'auto';
        miniWindow.style.bottom = 'auto';
    } else {
        miniWindow.style.bottom = '82px';
        miniWindow.style.right = '16px';
    }
    
    miniWindow.innerHTML = `
        <div style="width:30px;height:30px;border-radius:50%;overflow:hidden;background:var(--accent-color,#9C3D2E);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            ${partnerAvatar 
                ? `<img src="${partnerAvatar}" style="width:100%;height:100%;object-fit:cover;">` 
                : `<i class="fas fa-user" style="font-size:12px;color:rgba(255,255,255,0.82);"></i>`
            }
        </div>
        <div style="display:flex;flex-direction:column;gap:1px;">
            <div style="font-size:12px;font-weight:600;line-height:1.1;">陆沉</div>
            <div id="call-mini-timer" style="font-size:11px;color:rgba(255,255,255,0.5);font-variant-numeric:tabular-nums;font-weight:500;">${Math.floor((window.callSeconds || 0)/60).toString().padStart(2,'0')}:${((window.callSeconds || 0)%60).toString().padStart(2,'0')}</div>
        </div>
        <span style="width:6px;height:6px;border-radius:50%;background:#4caf50;box-shadow:0 0 5px #4caf50;animation:blink 1.6s ease-in-out infinite alternate;flex-shrink:0;"></span>
        <button onclick="event.stopPropagation();endCall()" style="width:30px;height:30px;border-radius:50%;border:none;background:rgba(255,82,82,0.75);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:8px;transition:background 0.2s,transform 0.15s;flex-shrink:0;">
            <i class="fas fa-phone-slash" style="font-size:10px;color:#fff;"></i>
        </button>
    `;

    // 拖动
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    
    miniWindow.onmousedown = function(e) {
        if (e.target.closest('button')) return;
        e.preventDefault();
        isDragging = false;
        const rect = miniWindow.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        
        document.onmousemove = function(ev) {
            isDragging = true;
            miniWindow.style.right = 'auto';
            miniWindow.style.bottom = 'auto';
            miniWindow.style.top = (ev.clientY - dragOffsetY) + 'px';
            miniWindow.style.left = (ev.clientX - dragOffsetX) + 'px';
        };
        
        document.onmouseup = function() {
            document.onmousemove = null;
            document.onmouseup = null;
            setTimeout(() => { 
                isDragging = false; 
                // 保存小窗口位置
                const rect = miniWindow.getBoundingClientRect();
                localStorage.setItem('callMiniPos', JSON.stringify({ x: rect.left, y: rect.top }));
            }, 100);
        };
    };
    
    miniWindow.onclick = function() {
        if (!isDragging) restoreCall();
    };

    document.body.appendChild(miniWindow);
};

// 恢复通话窗口
window.restoreCall = function() {
    const miniWindow = document.getElementById('call-mini-window');
    if (miniWindow) miniWindow.remove();

    const partnerAvatar = window.getPartnerAvatar();
    const secs = window.callSeconds || 0;
    const mins = Math.floor(secs / 60).toString().padStart(2, '0');
    const ss = (secs % 60).toString().padStart(2, '0');

    // 重新创建通话窗口
    const callWindow = document.createElement('div');
    callWindow.id = 'call-window';
    callWindow.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:300px;height:450px;background:linear-gradient(155deg,#0d1b2a 0%,#1b263b 50%,#415a77 100%);border-radius:24px;overflow:hidden;z-index:10000;box-shadow:0 20px 60px rgba(0,0,0,0.5);display:flex;flex-direction:column;';
    callWindow.innerHTML = `
        <div style="padding:20px;text-align:center;color:#fff;position:relative;">
            <div style="font-size:18px;font-weight:600;margin-bottom:4px;">陆沉</div>
            <div style="font-size:12px;opacity:0.6;" id="call-timer">${mins}:${ss}</div>
            <button onclick="minimizeCall()" style="position:absolute;top:16px;right:16px;width:28px;height:28px;border-radius:50%;border:none;background:rgba(255,255,255,0.15);color:#fff;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;">
                <i class="fas fa-minus"></i>
            </button>
        </div>
        <div style="flex:1;display:flex;align-items:center;justify-content:center;">
            <div style="width:100px;height:100px;border-radius:50%;overflow:hidden;border:2px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;">
                ${partnerAvatar 
                    ? `<img src="${partnerAvatar}" style="width:100%;height:100%;object-fit:cover;">` 
                    : `<i class="fas fa-user" style="font-size:40px;color:rgba(255,255,255,0.8);"></i>`
                }
            </div>
        </div>
        <div style="padding:30px 40px 40px;display:flex;justify-content:space-around;">
            <button onclick="endCall()" style="width:56px;height:56px;border-radius:50%;border:none;background:linear-gradient(135deg,#ff5252,#c62828);color:#fff;font-size:20px;cursor:pointer;box-shadow:0 4px 16px rgba(255,82,82,0.4);">
                <i class="fas fa-phone-slash"></i>
            </button>
        </div>
    `;
    document.body.appendChild(callWindow);
};

// 页面加载后延迟启动自动来电（1分钟后第一次）
setTimeout(function() {
    if (typeof window.scheduleIncomingCall === 'function') {
        window.scheduleIncomingCall();
    }
}, 60000);

// ========== TA的手机收藏功能 ==========
window.TaPhoneApp = (function() {
    const STORAGE_KEY = 'ta_phone_collections';
    const CHAT_CHANCE = 0.05;     // 聊天实时收藏概率 5%
    const MOMENTS_CHANCE = 0.15;   // 朋友圈实时收藏概率 15%
    
    let collections = { chat: [], moments: [] };
    
    // 加载收藏数据
    function loadCollections() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.chat) collections.chat = parsed.chat;
                if (parsed.moments) collections.moments = parsed.moments;
            }
        } catch(e) {
            console.warn('加载收藏失败:', e);
        }
    }
    
    // 保存收藏数据
    function saveCollections() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
        } catch(e) {
            console.warn('保存收藏失败:', e);
        }
    }
    
    // 添加收藏
    function addCollection(type, content, originalTime) {
        const item = {
            id: Date.now() + Math.random(),
            content: content,
            originalTime: originalTime || Date.now(),
            collectedTime: Date.now()
        };
        collections[type].unshift(item);
        saveCollections();
    }
    
    // 尝试收藏聊天消息
    function tryCollectChat(text) {
        if (!text) return;
        if (Math.random() < CHAT_CHANCE) {
            // 检查是否已经收藏过
            const already = collections.chat.some(c => c.content === text);
            if (!already) {
                addCollection('chat', text);
                console.log('陆沉收藏了你的聊天:', text);
            }
        }
    }
    
    // 尝试收藏朋友圈
    function tryCollectMoments(content) {
        if (!content) return;
        if (Math.random() < MOMENTS_CHANCE) {
            const already = collections.moments.some(c => c.content === content);
            if (!already) {
                addCollection('moments', content);
                console.log('陆沉收藏了你的朋友圈:', content);
            }
        }
    }
    
    // 删除收藏
    function deleteCollection(type, id) {
        if (!confirm('是否要偷偷取消他的收藏？')) return;
        collections[type] = collections[type].filter(item => item.id != id);
        saveCollections();
        renderList(currentTab);
    }
    
    // 格式化时间
    function formatTime(timestamp) {
        const date = new Date(timestamp);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');
        return `${month}-${day} ${hour}:${minute}`;
    }
    
    let currentTab = 'chat';
    
    // 渲染列表
    function renderList(type) {
        const listEl = document.getElementById('ta-phone-list');
        if (!listEl) return;
        
        let items = collections[type];
        
        // 过滤：只显示昨天及更早收藏的，今天收藏的第二天才显示
        const today = new Date();
        today.setHours(0,0,0,0);
        const yesterday = today.getTime() - 24*60*60*1000;
        items = items.filter(item => (item.collectedTime || 0) < yesterday);
        
        if (items.length === 0) {
            listEl.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#bbb;font-size:14px;">还没有可以偷看的收藏哦~<br><span style="font-size:12px;color:#ddd;">今天他偷偷收藏的，明天才能翻到啦</span></div>';
            return;
        }
        
        // 按收藏时间倒序
        items = [...items].sort((a, b) => (b.collectedTime || 0) - (a.collectedTime || 0));
        
        listEl.innerHTML = items.map(item => {
            return `
                <div style="background:#fff;border-radius:12px;padding:14px;margin-bottom:10px;position:relative;border:1px solid #f0f0f0;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
                    <button onclick="window.TaPhoneApp.deleteCollection('${type}', ${item.id})" style="position:absolute;top:8px;right:8px;width:24px;height:24px;border-radius:50%;border:none;background:#f5f5f5;color:#999;cursor:pointer;font-size:14px;line-height:1;">×</button>
                    <div style="font-size:14px;color:#333;line-height:1.5;margin-bottom:8px;word-break:break-word;padding-right:20px;">${item.content}</div>
                    <div style="font-size:11px;color:#999;">发送于: ${formatTime(item.originalTime)} | 收藏于: ${formatTime(item.collectedTime)}</div>
                </div>
            `;
        }).join('');
    }
    
    // 显示TA的手机弹窗
    function showTaPhone() {
        // 移除已有的弹窗
        const old = document.getElementById('ta-phone-modal');
        if (old) old.remove();
        
        const modal = document.createElement('div');
        modal.id = 'ta-phone-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);z-index:10001;display:flex;align-items:center;justify-content:center;';
        
        modal.innerHTML = `
            <div style="width:320px;height:500px;background:#fff;border-radius:24px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
                <!-- 头部 -->
                <div style="padding:16px 20px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f0f0f0;">
                    <button onclick="window.TaPhoneApp.hideTaPhone()" style="width:30px;height:30px;border-radius:50%;border:none;background:#f5f5f5;color:#666;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div style="font-size:16px;font-weight:600;color:#333;">他的收藏</div>
                    <div style="width:30px;"></div>
                </div>
                
                <!-- 标签切换 -->
                <div style="display:flex;border-bottom:1px solid #f0f0f0;">
                    <button id="tab-chat" onclick="window.TaPhoneApp.switchTab('chat')" style="flex:1;padding:12px;border:none;background:none;color:var(--accent-color,#9C3D2E);cursor:pointer;font-size:14px;font-weight:500;border-bottom:2px solid var(--accent-color,#9C3D2E);">聊天收藏</button>
                    <button id="tab-moments" onclick="window.TaPhoneApp.switchTab('moments')" style="flex:1;padding:12px;border:none;background:none;color:#999;cursor:pointer;font-size:14px;border-bottom:2px solid transparent;">朋友圈收藏</button>
                </div>
                
                <!-- 列表 -->
                <div id="ta-phone-list" style="flex:1;overflow-y:auto;padding:16px;background:#fafafa;"></div>
            </div>
        `;
        
        document.body.appendChild(modal);
        renderList('chat');
    }
    
    // 切换标签
    function switchTab(type) {
        currentTab = type;
        document.getElementById('tab-chat').style.borderBottomColor = type === 'chat' ? 'var(--accent-color,#9C3D2E)' : 'transparent';
        document.getElementById('tab-chat').style.color = type === 'chat' ? 'var(--accent-color,#9C3D2E)' : '#999';
        document.getElementById('tab-chat').style.fontWeight = type === 'chat' ? '500' : '400';
        document.getElementById('tab-moments').style.borderBottomColor = type === 'moments' ? 'var(--accent-color,#9C3D2E)' : 'transparent';
        document.getElementById('tab-moments').style.color = type === 'moments' ? 'var(--accent-color,#9C3D2E)' : '#999';
        document.getElementById('tab-moments').style.fontWeight = type === 'moments' ? '500' : '400';
        renderList(type);
    }
    
    // 隐藏弹窗
    function hideTaPhone() {
        const modal = document.getElementById('ta-phone-modal');
        if (modal) modal.remove();
    }
    
    // 初始化
    loadCollections();
    
    return {
        showTaPhone,
        hideTaPhone,
        switchTab,
        deleteCollection,
        tryCollectChat,
        tryCollectMoments
    };
})();

// 全局函数，方便HTML调用
window.showTaPhone = window.TaPhoneApp.showTaPhone;

