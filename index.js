(function() {
    'use strict';

    let autoRetryEnabled = false;
    let isRetrying = false;

    // 1. Tạo nút bấm trên giao diện
    const btn = document.createElement('button');
    btn.innerText = '🔄 Auto-Retry: TẮT';
    Object.assign(btn.style, {
        position: 'fixed',
        bottom: '15px',
        left: '15px',
        zIndex: '99999',
        padding: '8px 14px',
        backgroundColor: '#3a3a3a',
        color: '#ffffff',
        border: '1px solid #666',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '13px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        transition: 'all 0.2s'
    });

    btn.onclick = () => {
        autoRetryEnabled = !autoRetryEnabled;
        btn.innerText = autoRetryEnabled ? '🔄 Auto-Retry: BẬT' : '🔄 Auto-Retry: TẮT';
        btn.style.backgroundColor = autoRetryEnabled ? '#2e7d32' : '#3a3a3a';
        btn.style.borderColor = autoRetryEnabled ? '#4caf50' : '#666';
        isRetrying = false;
    };

    document.body.appendChild(btn);

    // 2. Hàm thực hiện bấm nút gửi lại ngay lập tức
    function triggerRetry() {
        if (!autoRetryEnabled) return;

        // Xóa ngay bảng thông báo lỗi để đón thông báo mới nếu lần gửi tiếp theo vẫn lỗi
        document.querySelectorAll('.toast-error, .toast').forEach(el => el.remove());

        const sendBtn = document.querySelector('#send_but');
        const regenBtn = document.querySelector('#option_regenerate');

        // Ưu tiên 1: Nếu chữ còn nằm trong khung chat hoặc nút Gửi đang hiện -> Bấm Gửi ngay
        if (sendBtn && sendBtn.offsetParent !== null) {
            sendBtn.click();
        } 
        // Ưu tiên 2: Bấm nút Regenerate nếu menu đang mở sẵn
        else if (regenBtn && regenBtn.offsetParent !== null) {
            regenBtn.click();
        } 
        // Ưu tiên 3: Mở nhanh menu tùy chọn và bấm Regenerate
        else {
            const mesButtons = document.querySelector('#options_button');
            if (mesButtons) {
                mesButtons.click();
                setTimeout(() => {
                    const rBtn = document.querySelector('#option_regenerate');
                    if (rBtn) rBtn.click();
                }, 50); // Mở và bấm cực nhanh trong 0.05 giây
            }
        }
    }

    // 3. Theo dõi thông báo lỗi xuất hiện trên màn hình
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

                    // Kiểm tra chữ "rate limited", "rate limit" hoặc "429"
                    if (isToast && (text.includes('rate limited') || text.includes('rate limit') || text.includes('429') || text.includes('too many requests'))) {
                        isRetrying = true;
                        btn.innerText = '⚡ Đang bắn lại...';

                        // Chờ đúng 0.1 giây (100ms) để SillyTavern kịp nhả khóa nút Gửi sau khi báo lỗi, rồi bấm ngay lập tức
                        setTimeout(() => {
                            if (autoRetryEnabled) {
                                triggerRetry();
                                btn.innerText = '🔄 Auto-Retry: BẬT';
                            }
                            isRetrying = false;
                        }, 100);

                        break;
                    }
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();