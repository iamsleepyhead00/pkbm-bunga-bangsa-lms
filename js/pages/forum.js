/**
 * forum.js - Forum discussion page controller (Guru & Siswa)
 * Thread-based discussion per course with reply count and last activity.
 */

import Auth from '../auth.js';
import dataService from '../data-service.js';
import { initLayout, showModal, closeModal, showToast, showLoading, hideLoading } from '../components.js';

const ForumPage = {
  session: null,
  role: null,
  courses: [],
  selectedCourseId: null,
  currentTopicId: null,

  async init() {
    this.session = Auth.checkSession();
    if (!this.session) {
      window.location.href = '/login.html';
      return;
    }
    this.role = this.session.role;

    if (this.role === 'GURU') {
      if (!Auth.enforceRole(['GURU'])) return;
      initLayout('GURU', 'forum', { pageTitle: 'Forum Diskusi' });
    } else {
      if (!Auth.enforceRole(['SISWA'])) return;
      initLayout('SISWA', 'forum', { pageTitle: 'Forum Diskusi' });
    }

    this.renderStructure();
    await this.loadCourses();
  },

  renderStructure() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="app-layout">
        <div id="sidebarContainer"></div>
        <main class="main-content" id="mainContent">
          <div class="page-header">
            <div class="page-header-info">
              <h2 class="page-title">Forum Diskusi</h2>
              <p class="page-subtitle">Diskusi interaktif per kursus</p>
            </div>
          </div>
          <div class="form-group" style="margin-bottom:1rem;">
            <label class="form-label">Pilih Kursus</label>
            <select class="form-select" id="forumCourseSelect">
              <option value="">-- Pilih Kursus --</option>
            </select>
          </div>
          <div id="forumContent"></div>
        </main>
      </div>`;
    initLayout(this.role, 'forum', { pageTitle: 'Forum Diskusi' });
  },

  async loadCourses() {
    try {
      if (this.role === 'GURU') {
        this.courses = await dataService.getCourses({ guruId: this.session.userId });
      } else {
        this.courses = await dataService.getCourses({ siswaId: this.session.userId });
      }

      const select = document.getElementById('forumCourseSelect');
      this.courses.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.nama} (${c.mataPelajaran})`;
        select.appendChild(opt);
      });

      select.addEventListener('change', () => {
        this.selectedCourseId = select.value;
        this.currentTopicId = null;
        if (this.selectedCourseId) {
          this.loadTopics();
        } else {
          document.getElementById('forumContent').innerHTML = '';
        }
      });

      // Auto-select from URL param
      const params = new URLSearchParams(window.location.search);
      const courseId = params.get('courseId');
      if (courseId && this.courses.find(c => c.id === courseId)) {
        select.value = courseId;
        this.selectedCourseId = courseId;
        await this.loadTopics();
      }
    } catch (err) {
      console.error('Error loading courses:', err);
    }
  },

  async loadTopics() {
    const container = document.getElementById('forumContent');
    showLoading(container);

    try {
      const topics = await dataService.getForumTopics(this.selectedCourseId);
      const users = JSON.parse(localStorage.getItem('pkbm_users') || '[]');

      if (!topics || topics.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="margin-top:1rem;">
            <i class="ri-discuss-line empty-state-icon"></i>
            <h3>Belum ada diskusi</h3>
            <p>Mulai diskusi baru di kursus ini</p>
          </div>
          <div style="text-align:center;margin-top:1rem;">
            <button class="btn btn-primary" id="btnNewTopic">
              <i class="ri-add-line"></i> Buat Topik Baru
            </button>
          </div>`;
        this.bindNewTopicBtn();
        return;
      }

      const topicsHtml = topics.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity))
        .map(topic => {
          const author = users.find(u => u.id === topic.userId);
          const authorName = author ? author.nama : 'Unknown';
          const date = new Date(topic.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
          const lastAct = new Date(topic.lastActivity).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

          return `<div class="card forum-topic-card" data-topic-id="${topic.id}" style="margin-bottom:0.75rem;cursor:pointer;padding:1rem;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
              <div>
                <h4 style="margin:0 0 0.25rem;">${this.escapeHtml(topic.judul)}</h4>
                <p class="text-muted" style="margin:0;font-size:0.85rem;">
                  Oleh <strong>${this.escapeHtml(authorName)}</strong> · ${date}
                </p>
              </div>
              <div style="text-align:right;">
                <span class="badge badge-info">${topic.replyCount} balasan</span>
                <p class="text-muted" style="margin:0.25rem 0 0;font-size:0.75rem;">Aktivitas: ${lastAct}</p>
              </div>
            </div>
          </div>`;
        }).join('');

      container.innerHTML = `
        <div style="display:flex;justify-content:flex-end;margin-bottom:1rem;">
          <button class="btn btn-primary" id="btnNewTopic">
            <i class="ri-add-line"></i> Buat Topik Baru
          </button>
        </div>
        <div id="topicsList">${topicsHtml}</div>`;

      this.bindNewTopicBtn();

      // Click topic to view
      container.querySelectorAll('.forum-topic-card').forEach(card => {
        card.addEventListener('click', () => {
          this.currentTopicId = card.dataset.topicId;
          this.loadTopicDetail();
        });
      });
    } catch (err) {
      console.error('Error loading topics:', err);
      container.innerHTML = '<div class="empty-state"><p>Gagal memuat forum</p></div>';
    }
  },

  bindNewTopicBtn() {
    const btn = document.getElementById('btnNewTopic');
    if (btn) {
      btn.addEventListener('click', () => this.showCreateTopicModal());
    }
  },

  showCreateTopicModal() {
    const formHtml = `
      <form id="newTopicForm">
        <div class="form-group">
          <label class="form-label" for="topicJudul">Judul Topik <span class="required">*</span></label>
          <input type="text" class="form-input" id="topicJudul" required placeholder="Judul diskusi">
        </div>
        <div class="form-group">
          <label class="form-label" for="topicIsi">Isi Pesan <span class="required">*</span></label>
          <textarea class="form-textarea" id="topicIsi" rows="4" required placeholder="Tulis pesan Anda..."></textarea>
        </div>
        <div id="topicError" class="form-error" hidden></div>
      </form>`;

    showModal('Buat Topik Baru', formHtml, [
      { label: 'Batal', type: 'secondary', handler: () => {} }
    ]);

    const modalFooter = document.querySelector('#appModal .modal-footer');
    if (modalFooter) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-primary';
      btn.textContent = 'Posting';
      btn.addEventListener('click', () => this.handleCreateTopic());
      modalFooter.appendChild(btn);
    }
  },

  async handleCreateTopic() {
    const judul = document.getElementById('topicJudul').value.trim();
    const isi = document.getElementById('topicIsi').value.trim();
    const errorEl = document.getElementById('topicError');

    if (!judul || !isi) {
      errorEl.textContent = 'Judul dan isi wajib diisi';
      errorEl.hidden = false;
      return;
    }

    try {
      await dataService.createForumTopic(this.selectedCourseId, {
        userId: this.session.userId,
        judul,
        isi
      });

      // Create notifications for other course participants
      await this.notifyForumActivity('topic', judul);

      showToast('Topik berhasil dibuat!', 'success');
      closeModal();
      await this.loadTopics();
    } catch (err) {
      console.error('Error creating topic:', err);
      showToast('Gagal membuat topik', 'error');
    }
  },

  async loadTopicDetail() {
    const container = document.getElementById('forumContent');
    showLoading(container);

    try {
      const topics = JSON.parse(localStorage.getItem('pkbm_forum_topics') || '[]');
      const topic = topics.find(t => t.id === this.currentTopicId);
      if (!topic) {
        container.innerHTML = '<p>Topik tidak ditemukan</p>';
        return;
      }

      const replies = await dataService.getTopicReplies(this.currentTopicId);
      const users = JSON.parse(localStorage.getItem('pkbm_users') || '[]');
      const author = users.find(u => u.id === topic.userId);
      const authorName = author ? author.nama : 'Unknown';
      const date = new Date(topic.createdAt).toLocaleString('id-ID');

      const repliesHtml = replies.map(r => {
        const rAuthor = users.find(u => u.id === r.userId);
        const rName = rAuthor ? rAuthor.nama : 'Unknown';
        const rDate = new Date(r.createdAt).toLocaleString('id-ID');
        return `<div class="card" style="margin-bottom:0.5rem;padding:0.75rem;">
          <div style="display:flex;justify-content:space-between;margin-bottom:0.25rem;">
            <strong>${this.escapeHtml(rName)}</strong>
            <span class="text-muted" style="font-size:0.8rem;">${rDate}</span>
          </div>
          <p style="margin:0;">${this.escapeHtml(r.isi)}</p>
        </div>`;
      }).join('');

      container.innerHTML = `
        <button class="btn btn-secondary btn-sm" id="btnBackToTopics" style="margin-bottom:1rem;">
          <i class="ri-arrow-left-line"></i> Kembali
        </button>
        <div class="card" style="margin-bottom:1rem;padding:1.25rem;">
          <h3 style="margin:0 0 0.5rem;">${this.escapeHtml(topic.judul)}</h3>
          <div style="display:flex;gap:1rem;margin-bottom:0.75rem;font-size:0.85rem;" class="text-muted">
            <span><i class="ri-user-line"></i> ${this.escapeHtml(authorName)}</span>
            <span><i class="ri-time-line"></i> ${date}</span>
          </div>
          <p>${this.escapeHtml(topic.isi)}</p>
        </div>
        <h4 style="margin-bottom:0.75rem;">Balasan (${replies.length})</h4>
        <div id="repliesList">${repliesHtml || '<p class="text-muted">Belum ada balasan</p>'}</div>
        <div class="card" style="padding:1rem;margin-top:1rem;">
          <div class="form-group">
            <label class="form-label" for="replyIsi">Tulis Balasan</label>
            <textarea class="form-textarea" id="replyIsi" rows="3" placeholder="Tulis balasan Anda..."></textarea>
          </div>
          <button class="btn btn-primary" id="btnSubmitReply">
            <i class="ri-send-plane-line"></i> Kirim Balasan
          </button>
        </div>`;

      document.getElementById('btnBackToTopics').addEventListener('click', () => {
        this.currentTopicId = null;
        this.loadTopics();
      });

      document.getElementById('btnSubmitReply').addEventListener('click', () => this.handleReply());
    } catch (err) {
      console.error('Error loading topic detail:', err);
      container.innerHTML = '<p>Gagal memuat detail topik</p>';
    }
  },

  async handleReply() {
    const isi = document.getElementById('replyIsi').value.trim();
    if (!isi) {
      showToast('Balasan tidak boleh kosong', 'warning');
      return;
    }

    try {
      await dataService.createReply(this.currentTopicId, {
        userId: this.session.userId,
        isi
      });

      // Notify
      const topics = JSON.parse(localStorage.getItem('pkbm_forum_topics') || '[]');
      const topic = topics.find(t => t.id === this.currentTopicId);
      if (topic) {
        await this.notifyForumActivity('reply', topic.judul);
      }

      showToast('Balasan berhasil dikirim!', 'success');
      await this.loadTopicDetail();
    } catch (err) {
      console.error('Error creating reply:', err);
      showToast('Gagal mengirim balasan', 'error');
    }
  },

  async notifyForumActivity(type, topicTitle) {
    try {
      // Get course students + guru
      const enrollments = JSON.parse(localStorage.getItem('pkbm_enrollments') || '[]');
      const courseEnrollments = enrollments.filter(e => e.courseId === this.selectedCourseId && e.aktif);
      const course = this.courses.find(c => c.id === this.selectedCourseId);

      const recipientIds = courseEnrollments.map(e => e.siswaId);
      if (course && course.guruId) recipientIds.push(course.guruId);

      // Exclude self
      const filtered = recipientIds.filter(id => id !== this.session.userId);

      const pesan = type === 'topic'
        ? `Topik baru di forum: "${topicTitle}"`
        : `Balasan baru di topik: "${topicTitle}"`;

      for (const userId of filtered) {
        await dataService.createNotification({
          userId,
          tipe: 'FORUM',
          pesan,
          link: `/pages/${this.role === 'GURU' ? 'guru' : 'siswa'}/forum.html?courseId=${this.selectedCourseId}`
        });
      }
    } catch (err) {
      console.error('Error creating notifications:', err);
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

export default ForumPage;
