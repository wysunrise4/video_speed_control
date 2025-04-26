// ==UserScript==
// @name         通用视频倍速播放控制器(固定位置+半透明)
// @namespace    http://scriptcat.org/
// @version      1.3
// @description  在视频网站添加浮动倍速控制按钮(固定位置+半透明)，可用于PC端网页浏览器，同时适配移动端浏览器，目前测试via浏览器可用，其余设备和软件请自测自改，谢谢。
// @author       wysunrise4
// @match        *://*/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 配置参数
    const config = {
        buttonPosition: { bottom: '100px', right: '20px' }, // 按钮位置
        speeds: [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0, 8.0], // 可选倍速
        defaultSpeed: 1.0, // 默认倍速
        buttonColor: '#00a1d6', // 按钮颜色
        activeColor: '#fb7299', // 激活颜色
        opacity: 0.5, // 按钮透明度(0-1)
        checkInterval: 1000, // 检查视频间隔(毫秒)
        maxRetry: 10 // 最大重试次数
    };

    let retryCount = 0;
    let videoObserver = null;

    // 创建浮动按钮
    function createFloatingButton(video) {
        // 移除可能已存在的按钮
        const oldBtn = document.getElementById('universal-speed-container');
        if (oldBtn) oldBtn.remove();

        // 设置初始倍速
        if (!video.playbackRate) {
            video.playbackRate = config.defaultSpeed;
        }

        // 创建主容器(固定位置)
        const mainContainer = document.createElement('div');
        mainContainer.id = 'universal-speed-container';
        Object.assign(mainContainer.style, {
            position: 'fixed',
            bottom: config.buttonPosition.bottom,
            right: config.buttonPosition.right,
            zIndex: '99999',
            fontFamily: 'Arial, sans-serif'
        });

        // 创建按钮容器(用于绝对定位面板)
        const btnContainer = document.createElement('div');
        btnContainer.style.position = 'relative';

        // 创建主按钮
        const mainBtn = document.createElement('button');
        mainBtn.id = 'universal-speed-btn';
        mainBtn.textContent = video.playbackRate.toFixed(2) + 'x';
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

        // 创建速度选项面板(绝对定位)
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
                color: video.playbackRate === speed ? 'white' : '#333',
                backgroundColor: video.playbackRate === speed ? config.activeColor : 'transparent',
                borderRadius: '4px',
                margin: '2px 5px',
                cursor: 'pointer',
                transition: 'all 0.2s'
            });

            speedBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                video.playbackRate = speed;
                mainBtn.textContent = speed.toFixed(2) + 'x';
                speedPanel.style.display = 'none';

                // 更新所有选项状态
                document.querySelectorAll('.universal-speed-option').forEach(opt => {
                    opt.style.color = opt.textContent === speed + 'x' ? 'white' : '#333';
                    opt.style.backgroundColor = opt.textContent === speed + 'x' ? config.activeColor : 'transparent';
                });
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
            mainBtn.textContent = video.playbackRate.toFixed(2) + 'x';
            updateSpeedOptions(video.playbackRate);
        });

        // 更新选项状态函数
        function updateSpeedOptions(currentSpeed) {
            document.querySelectorAll('.universal-speed-option').forEach(opt => {
                const optSpeed = parseFloat(opt.textContent);
                opt.style.color = optSpeed === currentSpeed ? 'white' : '#333';
                opt.style.backgroundColor = optSpeed === currentSpeed ? config.activeColor : 'transparent';
            });
        }
    }

    // 查找视频元素
    function findVideoElement() {
        // 优先查找正在播放的视频
        const playingVideos = Array.from(document.querySelectorAll('video')).filter(v => !v.paused);
        if (playingVideos.length > 0) {
            return playingVideos[0];
        }

        // 查找最大的视频元素
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

            // 设置观察器监听新视频元素
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
