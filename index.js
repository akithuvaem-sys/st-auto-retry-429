(function() {
    'use strict';

    let autoRetryEnabled = false;
    let isRetrying = false;
    // Nhớ trạng thái ẩn/hiện từ lần dùng trước
    let isMinimized = localStorage.getItem('st_autoretry_minimized') === 'true';

    function createUI() {
        // Tránh tạo trùng lặp nếu nút đã tồn tại
        if (document.getElementById('st-auto-retry-container')) return;

        // 1. Tạo khung chứa (Container) nằm ở vị trí an toàn cho cả PC và Điện thoại
        const container = document.createElement('div');
        container.id = 'st-auto-retry-container';
        Object.assign(container.style, {
            position: 'fixed',
            top: '65px', // Nằm ngay dưới thanh công cụ trên cùng, không bị bàn phím hay khung chat che
            left: '10px',
            zIndex: '2147483647', // Lớp cao nhất tuyệt đối để không bị giao diện điện thoại đè
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            userSelect: 'none',
            touchAction: 'none'
        });

        // 2. Tạo nút ấn để Ẩn / Hiện (Thu gọn)
        const toggleVisBtn = document.createElement('button');
        toggleVisBtn.id = 'st-auto-retry-vis-btn';
        Object.assign(toggleVisBtn.style, {
            padding: '6px 9px',
            backgroundColor: 'rgba(35, 35, 35, 0.9)',
            color: '#ffffff',
            border: '1px solid #777',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '13px',
            lineHeight: '1',
            boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        });

        // 3. Tạo nút Auto-Retry chính
        const mainBtn = document.createElement('button');
        mainBtn.id = 'st-auto-retry-main-btn';
        Object.assign(mainBtn.style, {
            padding: '7px 12px',
            backgroundColor: '#3a3a3a',
            color: '#ffffff',
            border: '1px solid #666',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.4)',
            transition: 'background-color 0.2s',
            whiteSpace: 'nowrap'
        });

        // Hàm cập nhật giao diện khi bấm Ẩn/Hiện hoặc Bật/Tắt
        function updateUI() {
            if (isMinimized) {
                mainBtn.style.display = 'none';
                // Khi thu gọn: Đổi icon theo trạng thái Bật (🟢) hoặc Tắt (⚫) để vẫn biết nút đang chạy hay không
                toggleVisBtn.innerText = autoRetryEnabled ? '🟢' : '👁️';
                toggleVisBtn.title = 'Ấn để hiện nút Auto-Retry';
                toggleVisBtn.style.borderColor = autoRetryEnabled ? '#4caf50' : '#777';
            } else {
                mainBtn.style.display = 'block';
                toggleVisBtn.innerText = '◀';
                toggleVisBtn.title = 'Ấn để ẩn bớt nút';
                toggleVisBtn.style.borderColor = '#777';
            }

            mainBtn.innerText = autoRetryEnabled ? '🔄 Auto-Retry: BẬT' : '🔄 Auto-Retry: TẮT';
            mainBtn.style.backgroundColor = autoRetryEnabled ? '#2e7d32' : '#3a3a3a';
            mainBtn.style.borderColor = autoRetryEnabled ? '#4caf50' : '#666';
        }

        // Sự kiện khi ấn nút Ẩn/Hiện
        toggleVisBtn.onclick = (e) => {
            e.stopPropagation();
            isMinimized = !isMinimized;
            localStorage.setItem('st_autoretry_minimized', isMinimized);
            updateUI();
        };

        // Sự kiện khi ấn nút Bật/Tắt Auto-Retry
        mainBtn.onclick = (e) => {
            e.stopPropagation();
            autoRetryEnabled = !autoRetryEnabled;
            isRetrying = false;
            updateUI();
        };

        // 4. Hỗ trợ dùng ngón tay (điện thoại) hoặc chuột kéo nút đi chỗ khác nếu vướng
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        container.addEventListener('pointerdown', (e) => {
            isDragging = false;
            startX = e.clientX;
            startY = e.clientY;
            const rect = container.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;
            container.setPointerCapture(e.pointerId);
        });

        container.addEventListener('pointermove', (e) => {
            if (!container.hasPointerCapture(e.pointerId)) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
                isDragging = true;
                container.style.left = `${Math.max(0, Math.min(window.innerWidth - 50, initialLeft + dx))}px`;
                container.style.top = `${Math.max(0, Math.min(window.innerHeight - 40, initialTop + dy))}px`;
            }
        });

        container.addEventListener('pointerup', (e) => {
            if (container.hasPointerCapture(e.pointerId)) {
                container.releasePointerCapture(e.pointerId);
            }
        });

        // Chặn bấm nhầm khi đang kéo nút trên màn hình cảm ứng
        container.addEventListener('click', (e) => {
            if (isDragging) {
                e.stopPropagation();
                e.preventDefault();
            }
        }, true);

        updateUI();
        container.appendChild(toggleVisBtn);
        container.appendChild(mainBtn);
        document.body.appendChild(container);
    }

    // Đảm bảo nút luôn hiện trên điện thoại kể cả khi web tải chậm
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createUI);
    } else {
        createUI();
    }
    setInterval(createUI, 2000); // Tự kiểm tra mỗi 2 giây, nếu giao diện điện thoại làm mất nút thì tự vẽ lại

    // 5. Hàm thực hiện bấm nút gửi lại ngay lập tức
    function triggerRetry() {
        if (!autoRetryEnabled) return;

        document.querySelectorAll('.toast-error, .toast').forEach(el => el.remove());

        const sendBtn = document.querySelector('#send_but');
        const regenBtn = document.querySelector('#option_regenerate');

        if (sendBtn && sendBtn.offsetParent !== null) {
            sendBtn.click();
        } else if (regenBtn && regenBtn.offsetParent !== null) {
            regenBtn.click();
        } else {
            const mesButtons = document.querySelector('#options_button');
            if (mesButtons) {
                mesButtons.click();
                setTimeout(() => {
                    const rBtn = document.querySelector('#option_regenerate');
                    if (rBtn) rBtn.click();
                }, 50);
            }
        }
    }

    // 6. Theo dõi thông báo lỗi xuất hiện trên màn hình
    const observer = new MutationObserver((mutations) => {
        if (!autoRetryEnabled || isRetrying) return;

        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === 1) {
                    const text = (node.innerText || '').toLowerCase();
                    const isToast = node.classList && (
                        node.classList.contains('toast') || 
                        node.classList.contains('toast-error') || 
                        node.id === 'toast-container' ||
                        node.querySelector('.toast-error')
                    );

                    if (isToast && (text.includes('rate limited') || text.includes('rate limit') || text.includes('429') || text.includes('too many requests'))) {
                        isRetrying = true;
                        const mainBtn = document.getElementById('st-auto-retry-main-btn');
                        if (mainBtn) mainBtn.innerText = '⚡ Đang bắn lại...';

                        setTimeout(() => {
                            if (autoRetryEnabled) {
                                triggerRetry();
                                if (mainBtn) mainBtn.innerText = '🔄 Auto-Retry: BẬT';
                            }
                            isRetrying = false;
                        }, 100);

                        break;
                    }
                }
            }
        }
    });

    function startObserver() {
        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
        } else {
            setTimeout(startObserver, 200);
        }
    }
    startObserver();
})();
