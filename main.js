// ==UserScript==
// @name         通用视频倍速播放控制器(键盘控制+记忆功能)
// @namespace    https://github.com/wysunrise4
// @version      1.5
// @description  支持键盘控制(z:1.0 x:-0.3 c:+0.3)和记忆功能的视频倍速控制器
// @author       https://github.com/wysunrise4
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 配置参数
    const config = {
        buttonPosition: { bottom: '100px', right: '20px' },
        speeds: [1.0, 1.5, 2.0, 4.0, 8.0, 16.0],
        defaultSpeed: 1.5,
        buttonColor: '#00a1d6',
        activeColor: '#fb7299',
        opacity: 0.5,
        checkInterval: 1000,
        maxRetry: 10,
        storageKey: 'videoSpeedPref',
        minSpeed: 0.1,  // 新增最小速度
        maxSpeed: 16    // 新增最大速度
    };

    let currentSpeed = GM_getValue(config.storageKey, config.defaultSpeed);
    let retryCount = 0;
    let videoObserver = null;
    let keyHandler = null; // 用于保存键盘事件处理器

    // 创建浮动按钮
    function createFloatingButton(video) {
        // 移除可能已存在的按钮和事件监听
        const oldBtn = document.getElementById('universal-speed-container');
        if (oldBtn) {
            document.removeEventListener('keydown', keyHandler);
            oldBtn.remove();
        }

        // 强制实施默认速度
        enforceDefaultSpeed(video);

        // 创建主容器
        const mainContainer = document.createElement('div');
        mainContainer.id = 'universal-speed-container';
        Object.assign(mainContainer.style, {
            position: 'fixed',
            bottom: config.buttonPosition.bottom,
            right: config.buttonPosition.right,
            zIndex: '99999',
            fontFamily: 'Arial, sans-serif'
        });

        // 创建按钮容器
        const btnContainer = document.createElement('div');
        btnContainer.style.position = 'relative';

        // 创建主按钮
        const mainBtn = document.createElement('button');
        mainBtn.id = 'universal-speed-btn';
        mainBtn.textContent = currentSpeed.toFixed(2) + 'x';
        Object.assign(mainBtn.style, {
            width: '60px',
            height: '30px',
            backgroundColor: config.buttonColor,
            color: 'white',
            border: 'none',
            borderRadius: '15px',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
            outline: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            opacity: config.opacity
        });

        // 鼠标交互效果
        mainBtn.addEventListener('mouseenter', () => {
            mainBtn.style.opacity = '0.8';
            mainBtn.style.transform = 'scale(1.05)';
        });
        mainBtn.addEventListener('mouseleave', () => {
            mainBtn.style.opacity = config.opacity;
            mainBtn.style.transform = 'scale(1)';
        });

        // 创建速度选项面板
        const speedPanel = document.createElement('div');
        speedPanel.id = 'universal-speed-panel';
        Object.assign(speedPanel.style, {
            display: 'none',
            position: 'absolute',
            bottom: '40px',
            right: '0',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '8px',
            padding: '8px 0',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            minWidth: '80px',
            zIndex: '100000',
            backdropFilter: 'blur(5px)'
        });

        // 添加倍速选项
        config.speeds.forEach(speed => {
            const speedBtn = document.createElement('div');
            speedBtn.className = 'universal-speed-option';
            speedBtn.textContent = speed + 'x';
            Object.assign(speedBtn.style, {
                padding: '8px 12px',
                textAlign: 'center',
                color: currentSpeed === speed ? 'white' : '#333',
                backgroundColor: currentSpeed === speed ? config.activeColor : 'transparent',
                borderRadius: '4px',
                margin: '2px 5px',
                cursor: 'pointer',
                transition: 'all 0.2s'
            });

            speedBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                currentSpeed = speed;
                video.playbackRate = speed;
                mainBtn.textContent = speed.toFixed(2) + 'x';
                speedPanel.style.display = 'none';
                GM_setValue(config.storageKey, speed);
                updateSpeedOptions(speed);
            });

            speedPanel.appendChild(speedBtn);
        });

        // 主按钮点击事件
        mainBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            speedPanel.style.display = speedPanel.style.display === 'none' ? 'block' : 'none';
        });

        // 点击页面其他区域关闭面板
        document.addEventListener('click', () => {
            speedPanel.style.display = 'none';
        });

        // 阻止面板点击事件冒泡
        speedPanel.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // 添加到页面
        btnContainer.appendChild(mainBtn);
        btnContainer.appendChild(speedPanel);
        mainContainer.appendChild(btnContainer);
        document.body.appendChild(mainContainer);

        // 监听视频速率变化
        video.addEventListener('ratechange', () => {
            if (Math.abs(video.playbackRate - currentSpeed) > 0.01) {
                currentSpeed = video.playbackRate;
                GM_setValue(config.storageKey, currentSpeed);
            }
            mainBtn.textContent = currentSpeed.toFixed(2) + 'x';
            updateSpeedOptions(currentSpeed);
        });

        // 跨标签页同步
        GM_addValueChangeListener(config.storageKey, (name, oldVal, newVal) => {
            if (newVal !== currentSpeed) {
                currentSpeed = newVal;
                video.playbackRate = newVal;
                mainBtn.textContent = newVal.toFixed(2) + 'x';
                updateSpeedOptions(newVal);
            }
        });

        // 键盘控制功能
        keyHandler = function(e) {
            const video = findVideoElement();
            if (!video || ['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return;

            let newSpeed = video.playbackRate;

            switch(e.key.toLowerCase()) {
                case 'z': // 重置为1.0
                    newSpeed = 1.0;
                    break;
                case 'x': // 减速0.3
                    newSpeed = Math.max(config.minSpeed, video.playbackRate - 0.3);
                    break;
                case 'c': // 加速0.3
                    newSpeed = Math.min(config.maxSpeed, video.playbackRate + 0.3);
                    break;
                default:
                    return;
            }

            e.preventDefault();
            currentSpeed = parseFloat(newSpeed.toFixed(2));
            video.playbackRate = currentSpeed;
            GM_setValue(config.storageKey, currentSpeed);
            mainBtn.textContent = currentSpeed.toFixed(2) + 'x';
            updateSpeedOptions(currentSpeed);
        };

        document.addEventListener('keydown', keyHandler);

        // 更新选项状态函数
        function updateSpeedOptions(speed) {
            document.querySelectorAll('.universal-speed-option').forEach(opt => {
                const optSpeed = parseFloat(opt.textContent);
                opt.style.color = optSpeed === speed ? 'white' : '#333';
                opt.style.backgroundColor = optSpeed === speed ? config.activeColor : 'transparent';
            });
        }
    }

    // 强制实施默认速度
    function enforceDefaultSpeed(video) {
        video.playbackRate = currentSpeed;

        const originalPlaybackRate = Object.getOwnPropertyDescriptor(
            HTMLMediaElement.prototype,
            'playbackRate'
        );

        Object.defineProperty(video, 'playbackRate', {
            get: originalPlaybackRate.get,
            set: function(value) {
                originalPlaybackRate.set.call(this, value);
                if (Math.abs(value - currentSpeed) > 0.01) {
                    setTimeout(() => {
                        originalPlaybackRate.set.call(this, currentSpeed);
                    }, 50);
                }
            },
            configurable: true
        });

        ['loadedmetadata', 'play', 'playing'].forEach(event => {
            video.addEventListener(event, () => {
                if (Math.abs(video.playbackRate - currentSpeed) > 0.01) {
                    video.playbackRate = currentSpeed;
                }
            });
        });
    }

    // 查找视频元素
    function findVideoElement() {
        const playingVideos = Array.from(document.querySelectorAll('video')).filter(v => !v.paused);
        if (playingVideos.length > 0) return playingVideos[0];

        const videos = Array.from(document.querySelectorAll('video'));
        if (videos.length > 0) {
            return videos.reduce((largest, current) => {
                return (current.offsetWidth * current.offsetHeight) > (largest.offsetWidth * largest.offsetHeight) ? current : largest;
            });
        }
        return null;
    }

    // 初始化函数
    function init() {
        const video = findVideoElement();
        if (video) {
            retryCount = 0;
            createFloatingButton(video);

            if (!videoObserver) {
                videoObserver = new MutationObserver(() => {
                    const newVideo = findVideoElement();
                    if (newVideo && !document.getElementById('universal-speed-container')) {
                        createFloatingButton(newVideo);
                    }
                });
                videoObserver.observe(document.body, { childList: true, subtree: true });
            }
        } else if (retryCount < config.maxRetry) {
            retryCount++;
            setTimeout(init, config.checkInterval);
        }
    }

    // 页面加载后初始化
    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }

    // 监听SPA页面变化
    let lastURL = location.href;
    setInterval(() => {
        if (location.href !== lastURL) {
            lastURL = location.href;
            init();
        }
    }, 1000);
})();
