'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useSupabase, useComments } from '../lib/hooks'
import { createComment, deleteComment, updateComment } from '../lib/comments'
import AvatarChip from './AvatarChip'

export default function TaskComments({ taskId, members, currentMemberId }) {
  const supabase = useSupabase()
  const { comments, loading } = useComments(taskId)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editBody, setEditBody] = useState('')
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionTarget, setMentionTarget] = useState('new')
  const [attachments, setAttachments] = useState([])
  const [uploading, setUploading] = useState(false)
  const textareaRef = useRef(null)
  const editTextareaRef = useRef(null)
  const mentionRef = useRef(null)
  const commentsEndRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [comments.length])

  useEffect(() => {
    const handler = (e) => {
      if (mentionRef.current && !mentionRef.current.contains(e.target)) {
        setShowMentions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const parseMentions = useCallback((text) => {
    const mentionedIds = []
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
    let match
    while ((match = mentionRegex.exec(text)) !== null) {
      mentionedIds.push(match[2])
    }
    return mentionedIds
  }, [])

  const renderCommentBody = useCallback((text) => {
    const parts = []
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
    let lastIndex = 0
    let match

    while ((match = mentionRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index))
      }
      parts.push(
        <span key={match.index} className="bg-indigo-100 text-indigo-700 rounded px-1 py-0.5 text-xs font-medium">
          @{match[1]}
        </span>
      )
      lastIndex = match.index + match[0].length
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }
    return parts
  }, [])

  const handleInput = (e, target) => {
    const val = e.target.value
    if (target === 'new') setBody(val)
    else setEditBody(val)

    const cursorPos = e.target.selectionStart
    const textBeforeCursor = val.slice(0, cursorPos)
    const atMatch = textBeforeCursor.match(/@(\w*)$/)

    if (atMatch) {
      setMentionQuery(atMatch[1].toLowerCase())
      setMentionTarget(target)
      setShowMentions(true)
    } else {
      setShowMentions(false)
    }
  }

  const insertMention = (member, target) => {
    const ref = target === 'new' ? textareaRef : editTextareaRef
    const currentVal = target === 'new' ? body : editBody
    const textarea = ref.current
    if (!textarea) return

    const cursorPos = textarea.selectionStart
    const textBeforeCursor = currentVal.slice(0, cursorPos)
    const atIndex = textBeforeCursor.lastIndexOf('@')
    const textAfterCursor = currentVal.slice(cursorPos)

    const mentionTag = `@[${member.name}](${member.id})`
    const newVal = textBeforeCursor.slice(0, atIndex) + mentionTag + ' ' + textAfterCursor

    if (target === 'new') setBody(newVal)
    else setEditBody(newVal)

    setShowMentions(false)
    setTimeout(() => {
      const newCursorPos = atIndex + mentionTag.length + 1
      textarea.focus()
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  // File upload handler
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setUploading(true)

    const newAttachments = []
    for (const file of files) {
      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`
        const filePath = `comments/${taskId}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, file)

        if (uploadError) {
          console.error('Upload error:', uploadError)
          continue
        }

        const { data: { publicUrl } } = supabase.storage
          .from('attachments')
          .getPublicUrl(filePath)

        newAttachments.push({
          name: file.name,
          url: publicUrl,
          type: file.type,
          size: file.size
        })
      } catch (err) {
        console.error('Failed to upload file:', err)
      }
    }

    setAttachments(prev => [...prev, ...newAttachments])
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const handleSend = async () => {
    if ((!body.trim() && attachments.length === 0) || !currentMemberId) return
    setSending(true)
    try {
      const mentions = parseMentions(body)
      await createComment(supabase, {
        task_id: taskId,
        author_id: currentMemberId,
        body: body.trim() || (attachments.length > 0 ? `Attached ${attachments.length} file(s)` : ''),
        mentions,
        attachments: attachments.length > 0 ? attachments : undefined
      })
      setBody('')
      setAttachments([])
    } catch (err) {
      console.error('Failed to send comment:', err)
    }
    setSending(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !showMentions) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleEditSave = async (commentId) => {
    if (!editBody.trim()) return
    try {
      const mentions = parseMentions(editBody)
      await updateComment(supabase, commentId, { body: editBody.trim(), mentions })
      setEditingId(null)
      setEditBody('')
    } catch (err) {
      console.error('Failed to update comment:', err)
    }
  }

  const handleDelete = async (commentId) => {
    if (!confirm('Delete this comment?')) return
    try {
      await deleteComment(supabase, commentId)
    } catch (err) {
      console.error('Failed to delete comment:', err)
    }
  }

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(mentionQuery)
  )

  const timeAgo = (dateStr) => {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHrs = Math.floor(diffMins / 60)
    if (diffHrs < 24) return `${diffHrs}h ago`
    const diffDays = Math.floor(diffHrs / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  const isImage = (type) => type && type.startsWith('image/')
  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  const renderAttachments = (atts) => {
    if (!atts || atts.length === 0) return null
    return (
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {atts.map((att, i) => (
          isImage(att.type) ? (
            <a key={i} href={att.url} target="_blank" rel="noreferrer" className="block">
              <img src={att.url} alt={att.name} className="max-w-[180px] max-h-[120px] rounded-lg border border-gray-200 object-cover hover:opacity-90" />
            </a>
          ) : (
            <a key={i} href={att.url} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1.5 hover:bg-gray-200 transition-colors">
              <span className="text-gray-500 text-xs">📎</span>
              <span className="text-xs text-gray-700 truncate max-w-[120px]">{att.name}</span>
              <span className="text-[10px] text-gray-400">{formatSize(att.size)}</span>
            </a>
          )
        ))}
      </div>
    )
  }

  return (
    <div className="mt-1">
      <label className="text-xs text-gray-500 font-medium block mb-2">
        Comments {comments.length > 0 && <span className="text-gray-400">({comments.length})</span>}
      </label>

      {loading ? (
        <p className="text-xs text-gray-400 italic mb-2">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-gray-400 mb-2">No comments yet. Start the discussion!</p>
      ) : (
        <div className="space-y-3 mb-3 max-h-64 overflow-y-auto pr-1">
          {comments.map(c => {
            const isAuthor = c.author_id === currentMemberId
            const isEditing = editingId === c.id

            return (
              <div key={c.id} className="group">
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 mt-0.5">
                    <AvatarChip name={c.author?.name || 'Unknown'} size="sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-gray-800">{c.author?.name || 'Unknown'}</span>
                      <span className="text-[10px] text-gray-400">{timeAgo(c.created_at)}</span>
                      {c.updated_at !== c.created_at && (
                        <span className="text-[10px] text-gray-400 italic">(edited)</span>
                      )}
                      {isAuthor && !isEditing && (
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1 ml-auto">
                          <button onClick={() => { setEditingId(c.id); setEditBody(c.body) }}
                            className="text-[10px] text-gray-400 hover:text-indigo-600">Edit</button>
                          <button onClick={() => handleDelete(c.id)}
                            className="text-[10px] text-gray-400 hover:text-red-600">Delete</button>
                        </div>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="mt-1 relative">
                        <textarea
                          ref={editTextareaRef}
                          value={editBody}
                          onChange={e => handleInput(e, 'edit')}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey && !showMentions) {
                              e.preventDefault()
                              handleEditSave(c.id)
                            }
                            if (e.key === 'Escape') {
                              setEditingId(null)
                              setEditBody('')
                            }
                          }}
                          rows={2}
                          className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none text-gray-800 focus:outline-none focus:border-indigo-300"
                        />
                        <div className="flex gap-1 mt-1">
                          <button onClick={() => handleEditSave(c.id)}
                            className="text-[10px] px-2 py-0.5 bg-indigo-600 text-white rounded hover:bg-indigo-700">Save</button>
                          <button onClick={() => { setEditingId(null); setEditBody('') }}
                            className="text-[10px] px-2 py-0.5 border border-gray-200 text-gray-600 rounded hover:bg-gray-50">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap mt-0.5">
                          {renderCommentBody(c.body)}
                        </p>
                        {renderAttachments(c.attachments)}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={commentsEndRef} />
        </div>
      )}

      {/* New comment input */}
      <div className="relative">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={body}
              onChange={e => handleInput(e, 'new')}
              onKeyDown={handleKeyDown}
              placeholder="Comment or tag someone with @..."
              rows={2}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-300"
            />
            {/* Attachment previews */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-2 pb-2">
                {attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1">
                    {isImage(att.type) ? (
                      <img src={att.url} alt="" className="w-8 h-8 rounded object-cover" />
                    ) : (
                      <span className="text-gray-500 text-xs">📎</span>
                    )}
                    <span className="text-[10px] text-gray-600 truncate max-w-[80px]">{att.name}</span>
                    <button onClick={() => removeAttachment(i)} className="text-gray-400 hover:text-red-500 text-xs ml-0.5">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1 self-end">
            <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip" />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="text-xs px-2 py-2 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 disabled:opacity-50" title="Attach file">
              {uploading ? '...' : '📎'}
            </button>
            <button onClick={handleSend} disabled={sending || (!body.trim() && attachments.length === 0)}
              className="text-xs px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0">
              {sending ? '...' : 'Send'}
            </button>
          </div>
        </div>

        {/* @mention dropdown */}
        {showMentions && filteredMembers.length > 0 && (
          <div ref={mentionRef} className="absolute bottom-full left-0 mb-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50 max-h-40 overflow-y-auto">
            {filteredMembers.map(m => (
              <button
                key={m.id}
                onClick={() => insertMention(m, mentionTarget)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-indigo-50 text-left transition-colors"
              >
                <AvatarChip name={m.name} size="sm" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{m.name}</p>
                  {m.email && <p className="text-[10px] text-gray-400 truncate">{m.email}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-[10px] text-gray-400 mt-1">Type @ to mention someone. 📎 to attach files. Enter to send.</p>
    </div>
  )
}
