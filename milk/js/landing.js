/* ============================================================
 * 前置界面（Landing）——聊天入口
 * 位于 splash 承诺之后、主聊天界面之前
 * 功能：双方头像 / 名字 / 状态 / 纪念日展示，资料与背景可编辑
 * ============================================================ */
(function () {
    'use strict';

    function $id(id) { return document.getElementById(id); }
    function safe(fn) { try { fn(); } catch (e) { console.warn('[landing]', e); } }

    function getSettings() {
        if (typeof window.settings !== 'undefined' && window.settings) return window.settings;
        if (typeof settings !== 'undefined' && settings) return settings;
        return {};
    }
    function saveNow() {
        try { if (typeof throttledSaveData === 'function') throttledSaveData(); } catch (e) {}
    }

    /* 从聊天区头像 DOM 读取当前头像 */
    function readChatAvatarSrc(which) {
        try {
            var el = document.querySelector(which === 'partner' ? '#partner-avatar img' : '#my-avatar img');
            return el && el.src ? el.src : '';
        } catch (e) { return ''; }
    }

    /* 把头像写入某个 .avatar 容器（兼容 <i> 占位与 <img>） */
    function setAvatar(boxEl, src) {
        if (!boxEl) return;
        if (!src) { boxEl.innerHTML = '<i class="fas fa-user"></i>'; return; }
        boxEl.innerHTML = '<img src="' + src + '" alt="">';
    }

    function daysSince(dateStr) {
        if (!dateStr) return null;
        var d = new Date(String(dateStr) + 'T00:00:00');
        if (isNaN(d.getTime())) return null;
        var now = new Date();
        var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        var start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        return Math.floor((today - start) / 86400000);
    }

    function readFileAsDataURL(file) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function () { resolve(reader.result); };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /* 渲染前置界面（数据来源：settings + 聊天头像 DOM） */
    // 前置界面：进入时让陆沉自己随机换一个状态（和聊天界面共用 settings.partnerStatus）
    function maybeRandomizeStatus() {
        try {
            if (typeof window._triggerStatusChange === 'function') {
                window._triggerStatusChange();
            }
        } catch (e) {}
    }

    function renderLanding() {
        safe(function () {
            var st = getSettings();

            var bg = $id('landing-bg');
            if (bg) {
                if (st.landingBg) {
                    bg.style.backgroundImage = 'url("' + st.landingBg + '")';
                    bg.style.backgroundSize = 'cover';
                    bg.style.backgroundPosition = 'center';
                } else {
                    bg.style.backgroundImage = '';
                    bg.style.backgroundSize = '';
                    bg.style.backgroundPosition = '';
                }
            }

            var pName = st.partnerName || '陆沉';
            var mName = st.myName || '我';
            var pStatus = st.partnerStatus || '在线';
            var mStatus = st.myStatus || '在线';

            var t = function (id, v) { var el = $id(id); if (el) el.textContent = v; };
            t('landing-partner-name', pName);
            t('landing-my-name', mName);
            t('landing-partner-status', pStatus);
            t('landing-my-status', mStatus);
            setAvatar($id('landing-partner-avatar'), readChatAvatarSrc('partner'));
            setAvatar($id('landing-my-avatar'), readChatAvatarSrc('me'));

            var label = st.landingLabel || '相恋已经';
            if (label === '我们在一起') label = '相恋已经';
            var date = st.landingDate || '';
            var days = daysSince(date);
            t('landing-ann-label', label);
            if (days !== null && days >= 0) {
                t('landing-ann-days', days === 0 ? '今天 · 是我们的第一天' : '第 ' + (days + 1) + ' 天');
                t('landing-ann-date', '从 ' + date + ' 开始');
            } else {
                t('landing-ann-days', '等待书写我们的故事');
                t('landing-ann-date', date ? ('从 ' + date + ' 开始') : '点击设置相恋日期');
            }

            // 消息翻牌：显示陆沉昨晚收藏的那句
            var flipEl = $id('landing-flip-hint');
            if (!flipEl) {
                var annDate = $id('landing-ann-date');
                if (annDate && annDate.parentNode) {
                    flipEl = document.createElement('div');
                    flipEl.id = 'landing-flip-hint';
                    flipEl.style.cssText = 'margin-top:10px;font-size:12px;color:var(--accent-color);opacity:0.85;line-height:1.6;padding:6px 12px;border-radius:8px;background:rgba(var(--accent-color-rgb),0.06);';
                    annDate.parentNode.insertBefore(flipEl, annDate.nextSibling);
                }
            }
            if (flipEl) {
                try {
                    var fm = JSON.parse(localStorage.getItem('flippedMsg') || 'null');
                    if (fm && fm.text) {
                        var now = new Date();
                        var todayKey = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();
                        if (fm.date !== todayKey) {
                            flipEl.textContent = '💌 陆沉反复看了你说的那句："' + fm.text + '"';
                            flipEl.style.display = '';
                        } else {
                            flipEl.style.display = 'none';
                        }
                    } else {
                        flipEl.style.display = 'none';
                    }
                } catch (e) { flipEl.style.display = 'none'; }
            }

            // 大时钟 + 日期
            updateClock();
        });
    }

    // 实时时钟
    var _clockTimer = null;
    function updateClock() {
        var now = new Date();
        var hh = String(now.getHours()).padStart(2, '0');
        var mm = String(now.getMinutes()).padStart(2, '0');
        var c = $id('landing-clock');
        if (c) c.textContent = hh + ':' + mm;
        var week = ['周日','周一','周二','周三','周四','周五','周六'][now.getDay()];
        var d = $id('landing-date');
        if (d) d.textContent = (now.getMonth()+1) + '月' + now.getDate() + '日 · ' + week;
    }
    function startClock() {
        if (_clockTimer) return;
        updateClock();
        _clockTimer = setInterval(updateClock, 1000);
    }

    function showView(name) {
        var main = $id('landing-main');
        var edit = $id('landing-edit');
        if (main) main.style.display = name === 'main' ? '' : 'none';
        if (edit) edit.style.display = name === 'edit' ? '' : 'none';
    }

    function openEdit() {
        safe(function () {
            var st = getSettings();
            var v = function (id, val) { var el = $id(id); if (el) el.value = val || ''; };
            v('le-my-name', st.myName || '我');
            v('le-partner-name', st.partnerName || '陆沉');
            v('le-my-status', st.myStatus || '在线');
            v('le-partner-status', st.partnerStatus || '在线');
            v('le-label', st.landingLabel || '我们在一起');
            v('le-date', st.landingDate || '');
            showView('edit');
        });
    }

    function applyAvatarTo(targetId, fileInput, previewId) {
        var file = fileInput && fileInput.files && fileInput.files[0];
        if (!file) return Promise.resolve(false);
        return readFileAsDataURL(file).then(function (dataUrl) {
            if (previewId) setAvatar($id(previewId), dataUrl);
            if (targetId) setAvatar($id(targetId), dataUrl);
            return true;
        }).catch(function () { return false; });
    }

    function saveEdit() {
        safe(function () {
            var st = getSettings();
            var v = function (id) { var el = $id(id); return el ? el.value.trim() : ''; };
            if (v('le-my-name')) st.myName = v('le-my-name');
            if (v('le-partner-name')) st.partnerName = v('le-partner-name');
            if (v('le-my-status')) st.myStatus = v('le-my-status');
            if (v('le-partner-status')) st.partnerStatus = v('le-partner-status');
            st.landingLabel = v('le-label') || '我们在一起';
            st.landingDate = v('le-date');

            /* 同步聊天头部 */
            var mn = $id('my-name'); if (mn) mn.textContent = st.myName;
            var pn = $id('partner-name'); if (pn) pn.textContent = st.partnerName;
            var mss = $id('my-status-text'); if (mss) mss.textContent = st.myStatus;
            var pss = document.querySelector('#partner-status span'); if (pss) pss.textContent = st.partnerStatus;

            var p1 = applyAvatarTo('partner-avatar', $id('le-partner-avatar'), 'landing-partner-avatar');
            var p2 = applyAvatarTo('my-avatar', $id('le-my-avatar'), 'landing-my-avatar');
            var p3 = (function () {
                var file = $id('le-bg') && $id('le-bg').files && $id('le-bg').files[0];
                if (!file) return Promise.resolve('');
                return readFileAsDataURL(file).catch(function () { return ''; });
            })();

            Promise.all([p1, p2, p3]).then(function (res) {
                if (res[2]) st.landingBg = res[2];
                saveNow();
                showView('main');
                renderLanding();
                try { if (typeof showNotification === 'function') showNotification('✓ 资料已保存', 'success'); } catch (e) {}
            });
        });
    }

    /* 首次进入：若免责声明尚未接受，进入聊天后弹出（承接原流程） */
    function maybeShowDisclaimer() {
        try {
            if (window.localforage && window.APP_PREFIX) {
                localforage.getItem(window.APP_PREFIX + 'tour_seen').then(function (seen) {
                    if (!seen && typeof showModal === 'function') {
                        var disc = $id('disclaimer-modal');
                        if (disc) showModal(disc);
                    }
                }).catch(function () {});
            }
        } catch (e) {}
    }

    window.showLanding = function () {
        var v = $id('landing-view');
        if (!v) return;
        // 不主动换状态：只到了随机时长才自然切换，保留活人感
        renderLanding();
        showView('main');
        v.style.display = 'flex';
        /* settings 由 localforage 异步加载，首帧可能尚未就绪，延迟再渲染一次确保纪念日/头像/背景显示 */
        setTimeout(function () { safe(renderLanding); }, 150);
        setTimeout(function () { safe(renderLanding); }, 500);
        // 纪念日 / 生日彩蛋：每天首次进入时检查一次
        setTimeout(function () { safe(checkSpecialDay); }, 800);
        /* 收起可能正开着的免责声明，等进入聊天后再出现 */
        try {
            var disc = $id('disclaimer-modal');
            if (disc && disc.style && disc.style.display !== 'none' && typeof hideModal === 'function') hideModal(disc);
        } catch (e) {}
    };

    // 检查今天是否是纪念日或陆沉生日，触发一次专属消息
    function checkSpecialDay() {
        try {
            var today = new Date();
            var key = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
            var last = localStorage.getItem('lastSpecialGreeting');
            if (last === key) return; // 今天已经触发过

            var st = getSettings();
            var hour = today.getHours();
            var myName = st.myName || '你';
            var messages = [];

            // 陆沉生日：1月22日
            if (today.getMonth() === 0 && today.getDate() === 22) {
                messages.push('今天是我的生日。但比起收到礼物，更想听到你说一句"生日快乐"。');
                messages.push('谢谢你，又陪我走过一年。');
            }

            // 纪念日：用户设置的 landingDate 的月日
            if (st.landingDate) {
                var parts = st.landingDate.split('-');
                if (parts.length === 3) {
                    var m = parseInt(parts[1], 10);
                    var d = parseInt(parts[2], 10);
                    if (m === today.getMonth() + 1 && d === today.getDate()) {
                        var days = daysSince(st.landingDate);
                        if (days !== null && days >= 0) {
                            messages.push('今天是我们在一起的第 ' + (days + 1) + ' 天。');
                            messages.push('时间过得真快，身边一直是你，真好。');
                        }
                    }
                }
            }

            if (messages.length) {
                localStorage.setItem('lastSpecialGreeting', key);
                // 延迟一点再发，避免和页面加载撞车
                setTimeout(function () {
                    messages.forEach(function (text, i) {
                        setTimeout(function () {
                            if (typeof addMessage === 'function') {
                                addMessage({
                                    id: Date.now() + i,
                                    sender: st.partnerName || '陆沉',
                                    text: text,
                                    timestamp: new Date(),
                                    status: 'received',
                                    favorited: false,
                                    note: null,
                                    type: 'normal'
                                });
                            }
                        }, i * 1200);
                    });
                }, 600);
            }
        } catch (e) {}
    }

    window.hideLanding = function () {
        var v = $id('landing-view');
        if (v) v.style.display = 'none';
        maybeShowDisclaimer();
    };

    function bind() {
        // 初始化：音乐播放器默认隐藏
        try {
            var player = document.getElementById('player');
            if (player) {
                player.classList.remove('visible');
                player.style.display = '';
            }
        } catch (e) {}

        /* 聊天界面头部的返回箭头：回到前置界面 */
        var backBtn = $id('back-to-landing-btn');
        if (backBtn) backBtn.addEventListener('click', function () { window.showLanding(); });

        var enter = $id('landing-enter-btn');
        if (enter) enter.addEventListener('click', function () { window.hideLanding(); });

        // 启动实时时钟
        startClock();

        // ── 宫格点击 ──
        var gl = $id('grid-library');
        if (gl) gl.addEventListener('click', function () {
            try {
                if (typeof openReplyLibraryModal === 'function') {
                    setTimeout(function() { openReplyLibraryModal(); }, 100);
                }
                else {
                    if (typeof renderReplyLibrary === 'function') renderReplyLibrary();
                    var m = document.getElementById('custom-replies-modal');
                    if (m && typeof showModal === 'function') showModal(m);
                }
            } catch (e) {}
        });

        var gd = $id('grid-diary');
        if (gd) gd.addEventListener('click', function () {
            try { if (typeof openDiaryModal === 'function') openDiaryModal(); } catch (e) {}
        });

        var ga = $id('grid-album');
        if (ga) ga.addEventListener('click', function () {
            try { if (typeof openAlbumModal === 'function') openAlbumModal(); } catch (e) {}
        });

        // 占卜（链接到运势占卜）
        var gt = $id('grid-tarot');
        if (gt) gt.addEventListener('click', function () {
            try {
                if (typeof generateFortune === 'function') generateFortune();
                else alert('占卜功能开发中~');
            } catch (e) { alert('占卜功能开发中~'); }
        });

        // 心情（链接到心情手账）
        var gm = $id('grid-mood');
        if (gm) gm.addEventListener('click', function () {
            try {
                var m = document.getElementById('mood-modal');
                if (m && typeof showModal === 'function') {
                    // 先渲染日历再打开
                    if (typeof renderMoodCalendar === 'function') renderMoodCalendar();
                    setTimeout(function() { showModal(m); }, 100);
                }
                else alert('心情手账功能开发中~');
            } catch (e) { alert('心情手账功能开发中~'); }
        });

        // 音乐播放器
        var gmu = $id('grid-music');
        if (gmu) gmu.addEventListener('click', function () {
            try {
                var player = document.getElementById('player');
                if (player) {
                    // 清除残留内联样式
                    player.style.display = '';
                    player.style.opacity = '';
                    player.style.transform = '';
                    // 切换显示/隐藏
                    if (player.classList.contains('visible')) {
                        player.classList.remove('visible');
                    } else {
                        player.classList.add('visible');
                    }
                } else {
                    alert('音乐播放器功能开发中~');
                }
            } catch (e) { alert('音乐播放器功能开发中~'); }
        });

        // ── 底部导航 ──
        // 通讯记录（弹窗）
        var navCallLog = $id('nav-calllog');
        if (navCallLog) navCallLog.addEventListener('click', function () {
            openCallLog();
        });

        // 朋友圈（切换页面）
        var navMom = $id('nav-moments');
        if (navMom) navMom.addEventListener('click', function () {
            openMoments();
        });

        // 传讯（中间大按钮，进入聊天）
        var navChat = $id('nav-chat');
        if (navChat) navChat.addEventListener('click', function () { window.hideLanding(); });

        // 收藏（弹窗）
        var navFav = $id('nav-favorite');
        if (navFav) navFav.addEventListener('click', function () {
            if (typeof openFavoritesModal === 'function') {
                openFavoritesModal();
            } else {
                alert('收藏功能加载中，请刷新试试');
            }
        });

        // 设置（弹窗）
        var navSet = $id('nav-settings');
        if (navSet) navSet.addEventListener('click', function () {
            try {
                var m = document.getElementById('settings-modal');
                if (m && typeof showModal === 'function') showModal(m);
            } catch (e) {}
        });

        // ── 点背景换前置背景：点卡片外的空白区域触发 ──
        var bgInput = document.createElement('input');
        bgInput.type = 'file'; bgInput.accept = 'image/*'; bgInput.style.display = 'none';
        document.body.appendChild(bgInput);
        var landingView = $id('landing-view');
        if (landingView) {
            landingView.addEventListener('click', function (e) {
                // 点到卡片、头像、名字、宫格等内部元素时不触发
                var card = e.target.closest('.landing-card-v2, .landing-grid, .landing-names, .landing-status-v2, .landing-couple-v2, .landing-clock, .landing-date, .landing-edit');
                if (card) return;
                bgInput.click();
            });
        }
        bgInput.addEventListener('change', function () {
            var f = this.files && this.files[0]; if (!f) return;
            readFileAsDataURL(f).then(function (url) {
                var st = getSettings();
                st.landingBg = url;
                try { if (typeof saveNow === 'function') saveNow(); } catch (e) {}
                var bgEl = $id('landing-bg');
                if (bgEl) {
                    bgEl.style.backgroundImage = 'url("' + url + '")';
                    bgEl.style.backgroundSize = 'cover';
                    bgEl.style.backgroundPosition = 'center';
                }
                try { if (typeof showNotification === 'function') showNotification('背景图已更新', 'success'); } catch (e) {}
            });
        });

        // ── 点哪改哪：头像 / 名字 / 状态 / 日期 ──
        // 隐藏的文件 input，点头像时触发
        var partnerFile = document.createElement('input');
        partnerFile.type = 'file'; partnerFile.accept = 'image/*'; partnerFile.style.display = 'none';
        document.body.appendChild(partnerFile);
        var myFile = document.createElement('input');
        myFile.type = 'file'; myFile.accept = 'image/*'; myFile.style.display = 'none';
        document.body.appendChild(myFile);

        var paAvatar = $id('landing-partner-avatar');
        if (paAvatar) {
            paAvatar.style.cursor = 'pointer';
            paAvatar.title = '点击更换陆沉头像';
            paAvatar.addEventListener('click', function () { partnerFile.click(); });
        }
        partnerFile.addEventListener('change', function () {
            var f = this.files && this.files[0]; if (!f) return;
            readFileAsDataURL(f).then(function (url) {
                // 1. 更新聊天头像 DOM
                var cp = document.getElementById('partner-avatar');
                if (cp) cp.innerHTML = '<img src="' + url + '" alt="avatar">';
                // 2. 持久化
                try { if (typeof localforage !== 'undefined') localforage.setItem(getStorageKey('partnerAvatar'), url); } catch (e) {}
                // 3. 更新前置头像
                var av = $id('landing-partner-avatar');
                if (av) { av.innerHTML = '<img src="' + url + '" alt="">'; }
                try { if (typeof saveNow === 'function') saveNow(); } catch (e) {}
                try { if (typeof showNotification === 'function') showNotification('陆沉头像已更新', 'success'); } catch (e) {}
            });
        });

        var myAvatar = $id('landing-my-avatar');
        if (myAvatar) {
            myAvatar.style.cursor = 'pointer';
            myAvatar.title = '点击更换我的头像';
            myAvatar.addEventListener('click', function () { myFile.click(); });
        }
        myFile.addEventListener('change', function () {
            var f = this.files && this.files[0]; if (!f) return;
            readFileAsDataURL(f).then(function (url) {
                // 1. 更新聊天头像 DOM
                var cm = document.getElementById('my-avatar');
                if (cm) cm.innerHTML = '<img src="' + url + '" alt="avatar">';
                // 2. 持久化
                try { if (typeof localforage !== 'undefined') localforage.setItem(getStorageKey('myAvatar'), url); } catch (e) {}
                // 3. 更新前置头像
                var av = $id('landing-my-avatar');
                if (av) { av.innerHTML = '<img src="' + url + '" alt="">'; }
                try { if (typeof saveNow === 'function') saveNow(); } catch (e) {}
                try { if (typeof showNotification === 'function') showNotification('我的头像已更新', 'success'); } catch (e) {}
            });
        });

        // 点名字
        var pName = $id('landing-partner-name');
        if (pName) {
            pName.style.cursor = 'pointer';
            pName.title = '点击修改陆沉的名字';
            pName.addEventListener('click', function () {
                var st = getSettings();
                var v = prompt('陆沉的名字：', st.partnerName || '陆沉');
                if (v !== null && v.trim()) { st.partnerName = v.trim(); try { saveNow(); } catch(e){} renderLanding(); }
            });
        }
        var mName = $id('landing-my-name');
        if (mName) {
            mName.style.cursor = 'pointer';
            mName.title = '点击修改我的名字';
            mName.addEventListener('click', function () {
                var st = getSettings();
                var v = prompt('我的名字：', st.myName || '我');
                if (v !== null && v.trim()) { st.myName = v.trim(); try { saveNow(); } catch(e){} renderLanding(); }
            });
        }

        // 点状态
        var pStatus = $id('landing-partner-status');
        if (pStatus) {
            pStatus.style.cursor = 'pointer';
            pStatus.title = '点击修改陆沉的状态';
            pStatus.addEventListener('click', function () {
                var st = getSettings();
                var v = prompt('陆沉现在的状态（如：在忙 / 想你了）：', st.partnerStatus || '在线');
                if (v !== null) { st.partnerStatus = v.trim() || '在线'; try { saveNow(); } catch(e){} renderLanding(); }
            });
        }

        // 点日期：用原生 date 输入
        var annDate = $id('landing-ann-date');
        if (annDate) {
            annDate.style.cursor = 'pointer';
            annDate.title = '点击修改相恋日期';
            annDate.addEventListener('click', function () {
                var st = getSettings();
                var v = prompt('相恋日期（格式 YYYY-MM-DD）：', st.landingDate || '');
                if (v !== null) { st.landingDate = v.trim(); try { saveNow(); } catch(e){} renderLanding(); }
            });
        }

        var cancel = $id('le-cancel');
        if (cancel) cancel.addEventListener('click', function () { showView('main'); });

        var save = $id('le-save');
        if (save) save.addEventListener('click', saveEdit);

        var bgReset = $id('le-bg-reset');
        if (bgReset) bgReset.addEventListener('click', function () {
            getSettings().landingBg = '';
            saveNow();
            showView('main');
            renderLanding();
            try { if (typeof showNotification === 'function') showNotification('已恢复默认背景', 'success'); } catch (e) {}
        });

        /* 选头像 / 背景后即时预览到主视图 */
        var pa = $id('le-partner-avatar');
        if (pa) pa.addEventListener('change', function () { applyAvatarTo(null, this, 'landing-partner-avatar'); });
        var ma = $id('le-my-avatar');
        if (ma) ma.addEventListener('change', function () { applyAvatarTo(null, this, 'landing-my-avatar'); });
        var bgIn = $id('le-bg');
        if (bgIn) bgIn.addEventListener('change', function () {
            var file = this.files && this.files[0];
            if (!file) return;
            readFileAsDataURL(file).then(function (dataUrl) {
                var bg = $id('landing-bg');
                if (bg) { bg.style.backgroundImage = 'url("' + dataUrl + '")'; bg.style.backgroundSize = 'cover'; bg.style.backgroundPosition = 'center'; }
            }).catch(function () {});
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bind);
    } else {
        bind();
    }

    // ── 朋友圈功能 ──
    window.openMoments = function () {
        var v = $id('moments-view');
        var lv = $id('landing-view');
        if (lv) lv.style.display = 'none';
        if (v) { v.style.display = 'block'; renderMoments(); }
    };
    window.closeMoments = function () {
        var v = $id('moments-view');
        var lv = $id('landing-view');
        if (v) v.style.display = 'none';
        if (lv) lv.style.display = '';
    };

    function getMoments() {
        try { return JSON.parse(localStorage.getItem('momentsData') || '[]'); }
        catch (e) { return []; }
    }
    function saveMoments(data) {
        try { localStorage.setItem('momentsData', JSON.stringify(data)); } catch (e) {}
    }

    function renderMoments() {
        var list = $id('moments-list');
        if (!list) return;
        
        try {
            var data = getMoments();
            
            // 更新顶部头像和名字（和前置界面同步）
            var myAvatar = $id('moments-my-avatar');
            var myName = $id('moments-my-name');
            var cover = $id('moments-cover');
            var settings = getSettings() || {};
            
            // 封面图用前置界面的背景图
            if (cover && settings.landingBg) {
                cover.style.backgroundImage = 'url("' + settings.landingBg + '")';
                cover.style.backgroundSize = 'cover';
                cover.style.backgroundPosition = 'center';
            }
            
            // 头像用前置界面的我的头像
            if (myAvatar) {
                try {
                    var ma = document.getElementById('my-avatar');
                    if (ma && ma.querySelector('img')) {
                        myAvatar.innerHTML = '<img src="' + ma.querySelector('img').src + '" style="width:100%;height:100%;object-fit:cover;">';
                    } else {
                        myAvatar.textContent = (settings.myName || '我').charAt(0);
                    }
                } catch (e) {
                    myAvatar.textContent = (settings.myName || '我').charAt(0);
                }
            }
            if (myName) myName.textContent = settings.myName || '我';
            var mySignature = $id('moments-my-signature');
            if (mySignature) mySignature.textContent = settings.mySignature || '';
            
            if (data.length === 0) {
                list.innerHTML = '<div style="text-align:center;color:#999;padding:60px 0;font-size:14px;">— 朋友圈 · 分享生活 —</div>';
                return;
            }
            
            list.innerHTML = data.slice().reverse().map(function (m) {
                var likes = m.likes || 0;
                var liked = m.liked ? 'liked' : '';
                var senderName = m.sender === 'me' ? (settings.myName || '我') : (settings.partnerName || '陆沉');
                
                // 获取头像
                var avatarHtml = '';
                try {
                    var avatarEl = document.getElementById(m.sender === 'me' ? 'my-avatar' : 'landing-partner-avatar');
                    if (avatarEl && avatarEl.querySelector('img')) {
                        avatarHtml = '<img src="' + avatarEl.querySelector('img').src + '" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">';
                    } else {
                        avatarHtml = senderName.charAt(0);
                    }
                } catch (e) {
                    avatarHtml = senderName.charAt(0);
                }
                
                var comments = (m.comments || []).map(function (c, idx) {
                    var replyHtml = c.replyTo ? ' <span style="color:#888;">回复</span> <b>' + c.replyTo + '</b>：' : '';
                    return '<div class="moment-comment" style="cursor:pointer;" onclick="replyComment(' + m.id + ',' + idx + ')">' +
                        '<b>' + c.from + '</b>：' + replyHtml + c.text +
                        '</div>';
                }).join('');
                var commentsHtml = comments ? '<div class="moment-comments">' + comments + '</div>' : '';
                
                return '<div class="moment-item">' +
                    '<div class="moment-avatar">' + avatarHtml + '</div>' +
                    '<div class="moment-content">' +
                    '<div class="moment-head-row">' +
                    '<span class="moment-name">' + senderName + '</span>' +
                    '<span class="moment-time">' + m.time + '</span>' +
                    '</div>' +
                    '<div class="moment-text">' + m.text + '</div>' +
                    (m.location ? '<div style="font-size:12px;color:#576b95;margin-top:4px;">📍 ' + m.location + '</div>' : '') +
                    (m.media && m.media.length ? '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-top:8px;">' + m.media.map(function (med, medIdx) {
                        if (med.type === 'image') {
                            return '<img src="' + med.url + '" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:4px;cursor:pointer;" onclick="openImageViewer(\'' + med.url + '\')">';
                        } else {
                            return '<video src="' + med.url + '" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:4px;" controls></video>';
                        }
                    }).join('') + '</div>' : '') +
                    '<div class="moment-action-row">' +
                    '<button class="moment-action ' + liked + '" onclick="likeMoment(' + m.id + ')">' +
                    (m.liked 
                        ? '<svg viewBox="0 0 24 24" fill="currentColor" style="color:var(--accent-color,#9C3D2E);"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>'
                        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>'
                    ) +
                    '</button>' +
                    '<button class="moment-action" onclick="commentMoment(' + m.id + ')">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
                    '</button>' +
                    '<button class="moment-action" onclick="deleteMoment(' + m.id + ')" style="margin-left:auto;color:#999;">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/></svg>' +
                    '</button>' +
                    '</div>' +
                    commentsHtml +
                    '</div>' +
                    '</div>';
            }).join('');
        } catch (e) {
            console.error('renderMoments error:', e);
            list.innerHTML = '<div style="text-align:center;color:#999;padding:60px 0;font-size:14px;">— 朋友圈 · 分享生活 —</div>';
        }
    }

    window.deleteMoment = function (id) {
        if (!confirm('确定要删除这条朋友圈吗？')) return;
        var data = getMoments();
        data = data.filter(function (x) { return x.id !== id; });
        saveMoments(data);
        renderMoments();
    };

    window.likeMoment = function (id) {
        var data = getMoments();
        var m = data.find(function (x) { return x.id === id; });
        if (!m) return;
        m.liked = !m.liked;
        m.likes = (m.likes || 0) + (m.liked ? 1 : -1);
        saveMoments(data);
        renderMoments();
        // 陆沉点赞后随机回复
        if (m.liked && Math.random() > 0.5) {
            var replies = getMomentsCommentReplies();
            setTimeout(function () {
                m.comments = m.comments || [];
                m.comments.push({ from: '陆沉', text: replies[Math.floor(Math.random() * replies.length)] });
                saveMoments(data);
                renderMoments();
            }, 1500);
        }
    };

    window.commentMoment = function (id) {
        var text = prompt('请输入评论内容：');
        if (!text || !text.trim()) return;
        var data = getMoments();
        var m = data.find(function (x) { return x.id === id; });
        if (!m) return;
        m.comments = m.comments || [];
        var settings = getSettings() || {};
        m.comments.push({ from: settings.myName || '我', text: text.trim() });
        saveMoments(data);
        renderMoments();
        // 陆沉随机回复
        setTimeout(function () {
            var replies = getMomentsCommentReplies();
            m.comments.push({ from: '陆沉', text: replies[Math.floor(Math.random() * replies.length)] });
            saveMoments(data);
            renderMoments();
        }, 2000);
    };

    window.replyComment = function (momentId, commentIdx) {
        var data = getMoments();
        var m = data.find(function (x) { return x.id === momentId; });
        if (!m || !m.comments || !m.comments[commentIdx]) return;
        var targetComment = m.comments[commentIdx];
        var text = prompt('回复 ' + targetComment.from + '：');
        if (!text || !text.trim()) return;
        var settings = getSettings() || {};
        m.comments.push({ 
            from: settings.myName || '我', 
            text: text.trim(), 
            replyTo: targetComment.from 
        });
        saveMoments(data);
        renderMoments();
        // 对方随机回复
        setTimeout(function () {
            var replies = getMomentsCommentReplies();
            m.comments.push({ 
                from: targetComment.from, 
                text: replies[Math.floor(Math.random() * replies.length)],
                replyTo: settings.myName || '我'
            });
            saveMoments(data);
            renderMoments();
        }, 1500);
    };

    // 绑定发布按钮
    window.closeFavoritesModal = function() {
        var modal = $id('favorites-modal');
        if (modal) modal.style.display = 'none';
    };

    window.openFavoritesModal = function() {
        var modal = $id('favorites-modal');
        if (!modal) return;
        var container = $id('favorites-list-container');
        // 读取陆沉收藏的消息
        var allFlipped = {};
        try { allFlipped = JSON.parse(localStorage.getItem('flippedMessages') || '{}'); } catch (e) {}
        var dates = Object.keys(allFlipped).sort().reverse();
        if (dates.length === 0) {
            container.innerHTML = '<div style="text-align:center;color:#999;padding:40px 0;font-size:14px;">还没有收藏的话~</div>';
        } else {
            container.innerHTML = dates.map(function(date) {
                var items = allFlipped[date];
                var dateLabel = date;
                // 把日期格式改成"X月X日"
                try {
                    var parts = date.split('-');
                    dateLabel = parseInt(parts[1]) + '月' + parseInt(parts[2]) + '日';
                } catch (e) {}
                return '<div style="margin-bottom:20px;">' +
                    '<div style="font-size:13px;color:#999;margin-bottom:10px;">' + dateLabel + '</div>' +
                    items.map(function(item) {
                        return '<div style="background:#f8f8f8;border-radius:8px;padding:12px;margin-bottom:8px;">' +
                            '<div style="font-size:14px;color:#333;line-height:1.5;">' + item.text + '</div>' +
                            '<div style="font-size:11px;color:#bbb;margin-top:6px;text-align:right;">' + item.time + '</div>' +
                            '</div>';
                    }).join('') +
                    '</div>';
            }).join('');
        }
        modal.style.display = 'flex';
    };

    window.closePublishBox = function () {
        $id('moments-publish-box').style.display = 'none';
        $id('moments-input').value = '';
        $id('moments-location').value = '';
        $id('moments-media-preview').innerHTML = '';
        window.pendingMomentMedia = [];
    };

    window.openImageViewer = function (url) {
        var viewer = document.createElement('div');
        viewer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:10099;display:flex;align-items:center;justify-content:center;cursor:zoom-out;';
        viewer.innerHTML = '<img src="' + url + '" style="max-width:90%;max-height:90%;object-fit:contain;border-radius:8px;">';
        viewer.onclick = function () { document.body.removeChild(viewer); };
        document.body.appendChild(viewer);
    };

    // 图片上传
    document.addEventListener('change', function (e) {
        if (e.target && e.target.id === 'moments-image-input') {
            window.pendingMomentMedia = window.pendingMomentMedia || [];
            var files = e.target.files;
            for (var i = 0; i < files.length; i++) {
                (function (file) {
                    var reader = new FileReader();
                    reader.onload = function (ev) {
                        window.pendingMomentMedia.push({ type: 'image', url: ev.target.result });
                        renderMediaPreview();
                    };
                    reader.readAsDataURL(file);
                })(files[i]);
            }
            e.target.value = '';
        }
        if (e.target && e.target.id === 'moments-video-input') {
            window.pendingMomentMedia = window.pendingMomentMedia || [];
            var file = e.target.files[0];
            if (file) {
                var reader = new FileReader();
                reader.onload = function (ev) {
                    window.pendingMomentMedia.push({ type: 'video', url: ev.target.result });
                    renderMediaPreview();
                };
                reader.readAsDataURL(file);
            }
            e.target.value = '';
        }
    });

    function renderMediaPreview() {
        var preview = $id('moments-media-preview');
        if (!preview) return;
        preview.innerHTML = '';
        (window.pendingMomentMedia || []).forEach(function (m, idx) {
            var div = document.createElement('div');
            div.style.cssText = 'width:60px;height:60px;border-radius:8px;overflow:hidden;position:relative;';
            if (m.type === 'image') {
                div.innerHTML = '<img src="' + m.url + '" style="width:100%;height:100%;object-fit:cover;">';
            } else {
                div.innerHTML = '<video src="' + m.url + '" style="width:100%;height:100%;object-fit:cover;"></video>';
            }
            preview.appendChild(div);
        });
    }

    document.addEventListener('click', function (e) {
        if (e.target && e.target.id === 'moments-back-btn') closeMoments();
        if (e.target && e.target.id === 'moments-edit-btn') openMomentsSettings();
        if (e.target && e.target.id === 'moments-publish-btn') {
            var box = $id('moments-publish-box');
            if (box) box.style.display = box.style.display === 'none' ? 'flex' : 'none';
        }
        if (e.target && e.target.id === 'moments-submit-btn') {
            var input = $id('moments-input');
            var text = input.value.trim();
            var location = $id('moments-location').value.trim();
            if (!text && !window.pendingMomentMedia) return;
            var data = getMoments();
            var now = new Date();
            data.push({
                id: Date.now(),
                sender: 'me',
                text: text,
                location: location || '',
                media: window.pendingMomentMedia || [],
                time: (now.getMonth()+1) + '月' + now.getDate() + '日 ' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0'),
                likes: 0,
                liked: false,
                comments: []
            });
            saveMoments(data);
            input.value = '';
            $id('moments-location').value = '';
            $id('moments-media-preview').innerHTML = '';
            window.pendingMomentMedia = [];
            $id('moments-publish-box').style.display = 'none';
            renderMoments();
            
            var settings = getSettings();
            var speed = (settings.momentsReplySpeed || 10) * 1000;
            var luCommentCount = Math.floor(Math.random() * 4); // 完全随机 0~3 条
            var friendNames = ['小夏', '阿泽', '念念', '七七', '丸子', '北北', '柚子', '桃桃', '阿黎', '星野', '晚晚', '可可'];
            var commentTexts = [
                '好看！', '好棒呀', '太可爱了吧', '羡慕了', '今天心情真好',
                '拍得真好', '想一起去', '哈哈哈好有趣', '氛围感拉满',
                '这也太会拍了', '宝藏分享', '感觉好治愈', '心动了',
                '什么时候带我去', '今日份快乐', '好喜欢这种感觉',
                '滤镜绝了', '生活记录get', '暖暖的', '太有格调了'
            ];
            // 陆沉的评论库从设置里读取
            var luCommentTexts = getMomentsCommentReplies();
            // 如果自定义评论库为空，用默认的宠溺评论
            if (!luCommentTexts || luCommentTexts.length === 0) {
                luCommentTexts = [
                    '我的小朋友真好看', '今天也很想你', '拍得真好，我喜欢',
                    '看到你开心我也开心', '要一直这么开心呀', '你在我眼里最好看',
                    '又可爱了', '今晚带你去吃好吃的', '我家小朋友真棒',
                    '随时都在想你', '今天的你也很耀眼', '想抱抱你'
                ];
            }
            
            // 陆沉点赞
            setTimeout(function () {
                var d = getMoments();
                var last = d[d.length - 1];
                last.likes = (last.likes || 0) + 1;
                saveMoments(d);
                renderMoments();
                
                // 陆沉评论（数量和速度由设置控制）
                for (var i = 0; i < luCommentCount; i++) {
                    (function(idx) {
                        setTimeout(function() {
                            var dd = getMoments();
                            var lst = dd[dd.length - 1];
                            lst.comments = lst.comments || [];
                            lst.comments.push({ from: '陆沉', text: luCommentTexts[Math.floor(Math.random() * luCommentTexts.length)] });
                            saveMoments(dd);
                            renderMoments();
                        }, speed * (idx + 1));
                    })(i);
                }
            }, speed);
            
            // 随机好友点赞评论（完全随机，不受设置控制）
            var friendCount = Math.floor(Math.random() * 4); // 0-3个好友
            for (var i = 0; i < friendCount; i++) {
                (function(idx) {
                    setTimeout(function() {
                        var dd = getMoments();
                        var lst = dd[dd.length - 1];
                        lst.likes = (lst.likes || 0) + 1;
                        if (Math.random() > 0.4) { // 60%概率评论
                            lst.comments = lst.comments || [];
                            lst.comments.push({ from: friendNames[Math.floor(Math.random() * friendNames.length)], text: commentTexts[Math.floor(Math.random() * commentTexts.length)] });
                        }
                        saveMoments(dd);
                        renderMoments();
                    }, 1000 * (idx + 1) * Math.random() * 3); // 1-3秒内随机
                })(i);
            }
        }
    });

    // ── 朋友圈设置 ──
    window.openMomentsSettings = function() {
        var modal = $id('moments-settings-modal');
        if (!modal) return;
        var settings = getSettings();
        // 填充现有值
        $id('moments-set-nickname').value = settings.myName || '';
        $id('moments-set-signature').value = settings.mySignature || '';
        var speed = settings.momentsReplySpeed || 10;
        $id('moments-set-reply-speed').value = speed;
        $id('moments-set-reply-speed-val').textContent = speed;
        renderMomentsCommentList();
        modal.style.display = 'flex';
    };

    // 评论库函数
    window.getMomentsCommentReplies = function() {
        try {
            // 版本号：如果是旧版本的评论库，自动清除更新
            var version = localStorage.getItem('momentsCommentRepliesVersion');
            if (version !== 'v2') {
                localStorage.removeItem('momentsCommentReplies');
                localStorage.setItem('momentsCommentRepliesVersion', 'v2');
            }
            var saved = localStorage.getItem('momentsCommentReplies');
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        // 默认评论（陆沉的宠溺评论）
        return [
            '我的小朋友真好看', '今天也很想你', '拍得真好，我喜欢',
            '看到你开心我也开心', '要一直这么开心呀', '你在我眼里最好看',
            '又可爱了', '今晚带你去吃好吃的', '我家小朋友真棒',
            '随时都在想你', '今天的你也很耀眼', '想抱抱你',
            '真好看', '我也喜欢', '今天很开心', '想你了', '拍得真好', '很有眼光'
        ];
    };

    window.saveMomentsCommentReplies = function(list) {
        try { localStorage.setItem('momentsCommentReplies', JSON.stringify(list)); } catch (e) {}
    };

    window.renderMomentsCommentList = function() {
        var list = getMomentsCommentReplies();
        var container = $id('moments-comment-list');
        if (!container) return;
        container.innerHTML = list.map(function(text, idx) {
            return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:#f8f8f8;border-radius:6px;margin-bottom:6px;font-size:13px;color:#666;">' +
                '<span>' + text + '</span>' +
                '<span onclick="deleteMomentsComment(' + idx + ')" style="cursor:pointer;color:#ff4d4f;font-size:16px;">&times;</span>' +
                '</div>';
        }).join('');
    };

    window.addMomentsComment = function() {
        var input = $id('moments-new-comment');
        var text = input.value.trim();
        if (!text) return;
        var list = getMomentsCommentReplies();
        list.push(text);
        saveMomentsCommentReplies(list);
        input.value = '';
        renderMomentsCommentList();
    };

    window.deleteMomentsComment = function(idx) {
        var list = getMomentsCommentReplies();
        list.splice(idx, 1);
        saveMomentsCommentReplies(list);
        renderMomentsCommentList();
    };
    
    window.closeMomentsSettings = function() {
        var modal = $id('moments-settings-modal');
        if (modal) modal.style.display = 'none';
    };
    
    window.saveMomentsSettings = function() {
        var settings = getSettings();
        // 保存昵称
        var nickname = $id('moments-set-nickname').value.trim();
        if (nickname) settings.myName = nickname;
        // 保存签名
        var signature = $id('moments-set-signature').value.trim();
        if (signature) settings.mySignature = signature;
        // 保存回复速度
        var speed = parseInt($id('moments-set-reply-speed').value) || 10;
        settings.momentsReplySpeed = speed;
        // 保存背景图
        var bgFile = $id('moments-set-bg').files[0];
        if (bgFile) {
            var reader = new FileReader();
            reader.onload = function(e) {
                settings.landingBg = e.target.result;
                try { localStorage.setItem('ysiah-settings', JSON.stringify(settings)); } catch (err) {}
                renderMoments();
                closeMomentsSettings();
            };
            reader.readAsDataURL(bgFile);
        } else {
            try { localStorage.setItem('ysiah-settings', JSON.stringify(settings)); } catch (err) {}
            renderMoments();
            closeMomentsSettings();
        }
    };
    
    // 回复速度滑块实时显示
    document.addEventListener('input', function(e) {
        if (e.target && e.target.id === 'moments-set-reply-speed') {
            $id('moments-set-reply-speed-val').textContent = e.target.value;
        }
    });

    // ── 通讯记录 ──
    window.openCallLog = function() {
        var modal = document.getElementById('calllog-modal');
        var list = document.getElementById('calllog-list');
        if (!modal || !list) return;
        
        var logs = JSON.parse(localStorage.getItem('ysiah-calllog') || '[]');
        
        // 计算统计
        var countEl = document.getElementById('calllog-count');
        var totalEl = document.getElementById('calllog-total');
        var totalSec = logs.reduce(function(sum, log) { return sum + log.duration; }, 0);
        var totalMin = Math.floor(totalSec / 60);
        var totalSecRemain = totalSec % 60;
        if (countEl) countEl.textContent = logs.length;
        if (totalEl) totalEl.textContent = totalMin + ':' + String(totalSecRemain).padStart(2, '0');
        
        if (logs.length === 0) {
            list.innerHTML = '<div style="text-align:center;color:var(--text-secondary);padding:40px 0;">暂无通话记录</div>';
        } else {
            // 获取陆沉头像（和前置界面一致）
            var partnerAvatar = '';
            try {
                var pa = document.getElementById('landing-partner-avatar');
                if (pa && pa.querySelector('img')) {
                    partnerAvatar = pa.querySelector('img').src;
                }
            } catch (e) {}
            
            var avatarHtml = partnerAvatar 
                ? '<img src="' + partnerAvatar + '" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0;">'
                : '<div style="width:44px;height:44px;border-radius:50%;background:var(--accent-color);color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:600;flex-shrink:0;">陆</div>';
            
            list.innerHTML = logs.slice().reverse().map(function(log) {
                var mins = Math.floor(log.duration / 60);
                var secs = log.duration % 60;
                var durText = mins > 0 ? mins + '分' + secs + '秒' : secs + '秒';
                return '<div style="display:flex;align-items:center;gap:12px;padding:14px 0;border-bottom:1px solid #f3f4f6;">'
                    + avatarHtml
                    + '<div style="flex:1;"><div style="font-size:15px;font-weight:500;color:#1f2937;display:flex;align-items:center;gap:6px;">陆沉 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg></div>'
                    + '<div style="font-size:13px;color:#6b7280;margin-top:2px;">' + durText + '</div></div>'
                    + '<div style="font-size:13px;color:#9ca3af;">' + log.date + '</div>'
                    + '</div>';
            }).join('');
        }
        
        modal.style.display = 'flex';
    };
    
    window.closeCallLog = function() {
        var modal = document.getElementById('calllog-modal');
        if (modal) modal.style.display = 'none';
    };
    
    // 记录通话的函数（供 call.js 调用）
    window.addCallLog = function(durationSec) {
        var logs = JSON.parse(localStorage.getItem('ysiah-calllog') || '[]');
        var now = new Date();
        logs.push({
            duration: durationSec,
            date: (now.getMonth()+1) + '月' + now.getDate() + '日 ' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0')
        });
        localStorage.setItem('ysiah-calllog', JSON.stringify(logs));
    };
})();
