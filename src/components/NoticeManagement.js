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
    is_published: true,
    scheduled_at: ''
  });
  const containerRef = React.useRef(null);

  useEffect(() => {
    loadNotices();
    
    // 30초마다 예약된 공지사항 자동 발행 체크
    const interval = setInterval(() => {
      checkScheduledNotices();
      loadNotices();
    }, 30000);
    
    // 컴포넌트 마운트 시 즉시 체크
    checkScheduledNotices();
    
    return () => clearInterval(interval);
  }, []);

  // 공지사항 목록 불러오기
  const loadNotices = async () => {
    try {
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotices(data || []);
    } catch (error) {
      console.error('Load notices error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 예약된 공지사항 자동 발행
  const checkScheduledNotices = async () => {
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('notices')
        .update({ is_published: true })
        .lte('scheduled_at', now)
        .eq('is_published', false)
        .not('scheduled_at', 'is', null)
        .select();

      if (error) throw error;
      
      if (data && data.length > 0) {
        console.log(`✅ ${data.length}개의 예약된 공지사항이 자동 발행되었습니다.`);
      }
    } catch (error) {
      console.error('Check scheduled notices error:', error);
    }
  };

  // 현재 시간 + 10분 (한국 시간 기준)
  const getDefaultScheduledTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 10);
    
    // datetime-local input은 로컬 시간을 사용하므로 그대로 반환
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // 공지사항 등록/수정
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
      let submitData = {
        title: formData.title,
        content: formData.content,
        is_pinned: formData.is_pinned
      };

      // 예약 발행인 경우
      if (formData.scheduled_at) {
        const scheduledDate = new Date(formData.scheduled_at);
        const now = new Date();
        
        if (scheduledDate <= now) {
          alert('예약 시간은 현재 시간보다 이후여야 합니다.');
          return;
        }
        
        submitData.is_published = false;
        submitData.scheduled_at = scheduledDate.toISOString();
      } 
      // 즉시 발행인 경우
      else {
        submitData.is_published = formData.is_published;
        submitData.scheduled_at = null;
      }

      if (editingNotice) {
        // 수정 시 읽음 기록 삭제
        const { error: deleteReadsError } = await supabase
          .from('notice_reads')
          .delete()
          .eq('notice_id', editingNotice.id);

        if (deleteReadsError) {
          console.error('Delete reads error:', deleteReadsError);
          // 읽음 기록 삭제 실패해도 공지사항 수정은 계속 진행
        }

        // 공지사항 수정
        const { error } = await supabase
          .from('notices')
          .update(submitData)
          .eq('id', editingNotice.id);

        if (error) throw error;
        alert('✅ 공지사항이 수정되었습니다!\n(모든 사용자가 다시 읽을 수 있도록 읽음 기록이 초기화되었습니다)');
      } else {
        // 새로 작성
        const { error } = await supabase
          .from('notices')
          .insert([submitData]);

        if (error) throw error;
        
        if (formData.scheduled_at) {
          const scheduledDate = new Date(formData.scheduled_at);
          alert(`✅ 공지사항이 예약되었습니다!\n발행 예정: ${scheduledDate.toLocaleString('ko-KR')}`);
        } else {
          alert('✅ 공지사항이 등록되었습니다!');
        }
      }

      resetForm();
      loadNotices();
    } catch (error) {
      console.error('Submit error:', error);
      alert('오류가 발생했습니다: ' + error.message);
    }
  };

  // 공지사항 수정 모드
  const handleEdit = (notice) => {
    setEditingNotice(notice);
    
    // 수정 시에는 항상 즉시 발행이 기본값
    setFormData({
      title: notice.title,
      content: notice.content,
      is_pinned: notice.is_pinned,
      is_published: true, // 항상 즉시 발행이 기본값
      scheduled_at: '' // 예약 시간 초기화
    });
    setIsWriting(true);
    
    // 상단으로 스크롤 (컨테이너 기준)
    setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    }, 100);
  };

  // 공지사항 삭제
  const handleDelete = async (id) => {
    if (!window.confirm('이 공지사항을 삭제하시겠습니까?')) {
      return;
    }

    try {
      // notice_reads는 ON DELETE CASCADE로 자동 삭제됨
      const { error } = await supabase
        .from('notices')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('🗑️ 공지사항이 삭제되었습니다.');
      loadNotices();
    } catch (error) {
      console.error('Delete error:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // 예약된 공지사항 즉시 발행
  const publishNow = async (id) => {
    if (!window.confirm('이 공지사항을 즉시 발행하시겠습니까?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('notices')
        .update({ 
          is_published: true,
          scheduled_at: null
        })
        .eq('id', id);

      if (error) throw error;
      alert('✅ 공지사항이 발행되었습니다!');
      loadNotices();
    } catch (error) {
      console.error('Publish error:', error);
      alert('발행 중 오류가 발생했습니다.');
    }
  };

  // 폼 초기화
  const resetForm = () => {
    setFormData({ 
      title: '', 
      content: '', 
      is_pinned: false,
      is_published: true,
      scheduled_at: ''
    });
    setIsWriting(false);
    setEditingNotice(null);
  };

  // 날짜 포맷 (한국 시간)
  const formatDate = (dateStr) => {
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

  // 공지사항 상태 표시
  const getNoticeStatus = (notice) => {
    if (!notice.is_published && notice.scheduled_at) {
      const scheduledDate = new Date(notice.scheduled_at);
      const now = new Date();
      
      if (scheduledDate > now) {
        return { label: '⏰ 예약됨', class: 'badge-info' };
      } else {
        return { label: '⏳ 발행 대기', class: 'badge-warning' };
      }
    }
    
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
                checked={!!formData.scheduled_at}
                onChange={(e) => {
                  if (e.target.checked) {
                    // 예약 발행 체크 시 즉시 발행 해제하고 예약 시간 설정
                    setFormData({ 
                      ...formData, 
                      scheduled_at: getDefaultScheduledTime(),
                      is_published: false
                    });
                  } else {
                    // 예약 발행 해제 시 즉시 발행으로 전환
                    setFormData({ 
                      ...formData, 
                      scheduled_at: '',
                      is_published: true
                    });
                  }
                }}
              />
              <span>⏰ 예약 발행 (현재 시간 +10분)</span>
            </label>
          </div>

          {formData.scheduled_at && (
            <div className="input-group">
              <label>예약 발행 시간</label>
              <input
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
          )}

          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={formData.is_published}
                onChange={(e) => {
                  if (e.target.checked) {
                    // 즉시 발행 체크 시 예약 시간 삭제
                    setFormData({ 
                      ...formData, 
                      is_published: true,
                      scheduled_at: ''
                    });
                  } else {
                    // 즉시 발행 해제
                    setFormData({ 
                      ...formData, 
                      is_published: false
                    });
                  }
                }}
              />
              <span>✅ 즉시 발행</span>
            </label>
          </div>

          <div className="form-buttons">
            <button className="btn btn-primary" onClick={handleSubmit}>
              {editingNotice ? '수정하기' : (formData.scheduled_at ? '예약하기' : '등록하기')}
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
                <th>예약/발행일</th>
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
                      {notice.scheduled_at ? (
                        <span style={{ color: '#e0b0ff' }}>
                          {formatDate(notice.scheduled_at)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        {!notice.is_published && notice.scheduled_at && (
                          <button 
                            className="btn-publish"
                            onClick={() => publishNow(notice.id)}
                            title="즉시 발행"
                          >
                            🚀
                          </button>
                        )}
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