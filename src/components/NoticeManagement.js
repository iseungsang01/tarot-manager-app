import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function NoticeManagement({ onBack }) {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isWriting, setIsWriting] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    is_pinned: false,
    is_published: true
  });
  const containerRef = React.useRef(null);

  useEffect(() => {
    loadNotices();
  }, []);

  const loadNotices = async () => {
    try {
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // 로컬 스토리지에서 예약 정보 가져오기
      const noticesWithSchedule = data.map(notice => {
        const scheduleKey = `notice_schedule_${notice.id}`;
        const scheduledAt = localStorage.getItem(scheduleKey);
        return {
          ...notice,
          scheduled_at: scheduledAt
        };
      });
      
      setNotices(noticesWithSchedule || []);
    } catch (error) {
      console.error('Load notices error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }
    if (!formData.content.trim()) {
      alert('내용을 입력해주세요.');
      return;
    }

    try {
      const submitData = {
        title: formData.title,
        content: formData.content,
        is_pinned: formData.is_pinned,
        is_published: formData.is_published
      };

      if (editingNotice) {
        const { error } = await supabase
          .from('notices')
          .update(submitData)
          .eq('id', editingNotice.id);

        if (error) throw error;
        
        // 로컬 스토리지의 예약 정보도 삭제
        localStorage.removeItem(`notice_schedule_${editingNotice.id}`);
        
        alert('✅ 공지사항이 수정되었습니다!');
      } else {
        const { error } = await supabase
          .from('notices')
          .insert([submitData]);

        if (error) throw error;
        alert('✅ 공지사항이 등록되었습니다!');
      }

      resetForm();
      loadNotices();
    } catch (error) {
      console.error('Submit error:', error);
      alert('오류가 발생했습니다: ' + error.message);
    }
  };

  const handleEdit = (notice) => {
    setEditingNotice(notice);
    setFormData({
      title: notice.title,
      content: notice.content,
      is_pinned: notice.is_pinned,
      is_published: notice.is_published
    });
    setIsWriting(true);
    
    setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    }, 100);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('이 공지사항을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('notices')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // 로컬 스토리지의 예약 정보도 삭제
      localStorage.removeItem(`notice_schedule_${id}`);
      
      alert('🗑️ 공지사항이 삭제되었습니다.');
      loadNotices();
    } catch (error) {
      console.error('Delete error:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const resetForm = () => {
    setFormData({ 
      title: '', 
      content: '', 
      is_pinned: false,
      is_published: true
    });
    setIsWriting(false);
    setEditingNotice(null);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const getNoticeStatus = (notice) => {
    if (!notice.is_published) {
      return { label: '📝 임시저장', class: 'badge-secondary' };
    }
    
    if (notice.is_pinned) {
      return { label: '📌 고정', class: 'badge-success' };
    }
    
    return { label: '✅ 발행됨', class: 'badge-normal' };
  };

  return (
    <div className="notice-management" ref={containerRef}>
      <div className="notice-header">
        <h1>📢 공지사항 관리</h1>
        <div className="header-buttons">
          {!isWriting && (
            <button className="btn btn-success" onClick={() => setIsWriting(true)}>
              + 새 공지사항 작성
            </button>
          )}
          <button className="btn-close" onClick={onBack}>
            ✕ 닫기
          </button>
        </div>
      </div>

      {isWriting && (
        <div className="notice-form">
          <h2>{editingNotice ? '공지사항 수정' : '새 공지사항 작성'}</h2>
          
          <div className="input-group">
            <label>제목</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="공지사항 제목을 입력하세요"
            />
          </div>

          <div className="input-group">
            <label>내용</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="공지사항 내용을 입력하세요"
              rows="8"
            />
          </div>

          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={formData.is_pinned}
                onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
              />
              <span>📌 상단 고정</span>
            </label>
          </div>

          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={formData.is_published}
                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
              />
              <span>✅ 즉시 발행</span>
            </label>
          </div>

          <div className="form-buttons">
            <button className="btn btn-primary" onClick={handleSubmit}>
              {editingNotice ? '수정하기' : '등록하기'}
            </button>
            <button className="btn btn-warning" onClick={resetForm}>
              취소
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">로딩 중...</div>
      ) : notices.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔭</div>
          <h3>등록된 공지사항이 없습니다</h3>
          <p>새 공지사항을 작성해보세요!</p>
        </div>
      ) : (
        <div className="notice-list">
          <table>
            <thead>
              <tr>
                <th>상태</th>
                <th>제목</th>
                <th>등록일</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {notices.map((notice) => {
                const status = getNoticeStatus(notice);
                return (
                  <tr key={notice.id} style={{ opacity: notice.is_published ? 1 : 0.7 }}>
                    <td>
                      <span className={`badge ${status.class}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="notice-title-cell">{notice.title}</td>
                    <td>{formatDate(notice.created_at)}</td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn-edit"
                          onClick={() => handleEdit(notice)}
                        >
                          ✏️
                        </button>
                        <button 
                          className="btn-delete"
                          onClick={() => handleDelete(notice.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default NoticeManagement;