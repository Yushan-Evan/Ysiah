/* ============================================================
 * Ysiah 画廊——本地素材页
 * 第一步：音乐盒（BGM 上传 / 播放 / 删除 / 总开关）
 * 数据存 localforage（浏览器本地），key = 'galleryMusic'
 * ============================================================ */
(function () {
    'use strict';

    var MUSIC_KEY = 'galleryMusic';
    var playlist = [];          // [{name, dataUrl}]
    var currentIndex = -1;
    var audio = null;
    var bgmOn = true;

    function $(id) { return document.getElementById(id); }

    function loadMusic() {
        try {
            localforage.getItem(MUSIC_KEY).then(function (data) {
                if (Array.isArray(data)) { playlist = data; renderList(); }
            }).catch(function () {});
        } catch (e) {}
    }

    function saveMusic() {
        try { localforage.setItem(MUSIC_KEY, playlist); } catch (e) {}
    }

    function ensureAudio() {
        if (!audio) {
            audio = new Audio();
            audio.loop = false;
            audio.addEventListener('ended', function () { playNext(); });
            audio.addEventListener('error', function () { /* 忽略播放错误 */ });
        }
        return audio;
    }

    function fmtTime(sec) {
        if (!sec || isNaN(sec)) return '';
        var m = Math.floor(sec / 60), s = Math.floor(sec % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function renderList() {
        var list = $('gallery-music-list');
        if (!list) return;
        list.innerHTML = '';
        if (playlist.length === 0) {
            list.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-secondary);font-size:12px;">还没有音乐，点上方按钮上传喜欢的 BGM 吧</div>';
            return;
        }
        playlist.forEach(function (item, idx) {
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--border-color);border-radius:10px;margin-bottom:8px;background:var(--secondary-bg);';
            var isPlaying = (idx === currentIndex && bgmOn);
            row.innerHTML =
                '<button class="gm-play" data-idx="' + idx + '" style="width:34px;height:34px;border-radius:50%;border:none;background:' + (isPlaying ? 'var(--accent-color)' : 'rgba(var(--accent-color-rgb),0.12)') + ';color:' + (isPlaying ? '#fff' : 'var(--accent-color)') + ';cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;">' +
                    (isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>') +
                '</button>' +
                '<div style="flex:1;min-width:0;">' +
                    '<div style="font-size:13px;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + item.name + '</div>' +
                    '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">' + (isPlaying ? '正在播放' : '点击播放') + '</div>' +
                '</div>' +
                '<button class="gm-del" data-idx="' + idx + '" style="border:none;background:none;color:var(--text-secondary);cursor:pointer;font-size:13px;padding:6px;">删除</button>';
            list.appendChild(row);
        });

        list.querySelectorAll('.gm-play').forEach(function (btn) {
            btn.addEventListener('click', function () { togglePlay(parseInt(btn.dataset.idx, 10)); });
        });
        list.querySelectorAll('.gm-del').forEach(function (btn) {
            btn.addEventListener('click', function () { removeItem(parseInt(btn.dataset.idx, 10)); });
        });
    }

    function playNext() {
        if (!bgmOn || playlist.length === 0) return;
        currentIndex = (currentIndex + 1) % playlist.length;
        startPlay();
    }

    function startPlay() {
        if (currentIndex < 0 || currentIndex >= playlist.length) return;
        var a = ensureAudio();
        a.src = playlist[currentIndex].dataUrl;
        a.play().catch(function () {});
        renderList();
    }

    function togglePlay(idx) {
        var a = ensureAudio();
        if (idx === currentIndex && !a.paused) {
            a.pause();
            renderList();
            return;
        }
        currentIndex = idx;
        startPlay();
    }

    function removeItem(idx) {
        if (idx < 0 || idx >= playlist.length) return;
        if (!confirm('删除「' + playlist[idx].name + '」？')) return;
        if (idx === currentIndex) {
            ensureAudio().pause();
            currentIndex = -1;
        }
        playlist.splice(idx, 1);
        saveMusic();
        renderList();
    }

    function handleFiles(fileList) {
        var files = Array.prototype.slice.call(fileList || []);
        var pending = files.length;
        if (pending === 0) return;
        files.forEach(function (file) {
            if (!/^audio\//.test(file.type) && !/\.(mp3|m4a|ogg|wav|flac|aac)$/i.test(file.name)) { pending--; return; }
            if (file.size > 20 * 1024 * 1024) { pending--; if (window.showNotification) showNotification('单首不能超过 20MB', 'warning'); return; }
            var reader = new FileReader();
            reader.onload = function (ev) {
                playlist.push({ name: file.name.replace(/\.[^.]+$/, ''), dataUrl: ev.target.result });
                pending--;
                if (pending === 0) { saveMusic(); renderList(); if (window.showNotification) showNotification('✓ 音乐已添加', 'success'); }
            };
            reader.onerror = function () { pending--; };
            reader.readAsDataURL(file);
        });
    }

    window.openGallery = function () {
        var modal = $('gallery-modal');
        if (!modal) return;
        if (typeof showModal === 'function') showModal(modal);
        else modal.style.display = 'flex';
        renderList();
    };

    window.closeGallery = function () {
        var modal = $('gallery-modal');
        if (!modal) return;
        if (typeof hideModal === 'function') hideModal(modal);
        else modal.style.display = 'none';
    };

    document.addEventListener('DOMContentLoaded', function () {
        loadMusic();
        var uploadBtn = $('gallery-music-upload');
        var fileInput = $('gallery-music-file');
        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', function () { fileInput.click(); });
            fileInput.addEventListener('change', function () { handleFiles(fileInput.files); fileInput.value = ''; });
        }
        var closeBtn = $('gallery-close');
        if (closeBtn) closeBtn.addEventListener('click', window.closeGallery);
        var modal = $('gallery-modal');
        if (modal) modal.addEventListener('click', function (e) { if (e.target === modal) window.closeGallery(); });

        var sw = $('gallery-bgm-switch');
        if (sw) {
            sw.addEventListener('click', function () {
                bgmOn = !bgmOn;
                sw.classList.toggle('on', bgmOn);
                if (!bgmOn && audio) audio.pause();
                if (bgmOn && playlist.length > 0 && (!audio || audio.paused)) {
                    if (currentIndex < 0) currentIndex = 0;
                    startPlay();
                }
            });
        }
    });
})();
