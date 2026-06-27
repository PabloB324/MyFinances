'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/auth-context'
import type { GroupInfo, GroupTransaction, TransactionType } from '@/types/models'
import { generateGroupCode } from '@/lib/utils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function groupFromRow(r: any, members: GroupInfo['members'], memberNames: GroupInfo['memberNames'], memberPhotoURLs: GroupInfo['memberPhotoURLs']): GroupInfo {
  return {
    id: r.id,
    name: r.name,
    code: r.code,
    createdBy: r.created_by,
    createdAt: new Date(r.created_at),
    members,
    memberNames,
    memberPhotoURLs,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function gtxFromRow(r: any): GroupTransaction {
  return {
    id: r.id,
    title: r.title,
    amount: Number(r.amount),
    date: new Date(r.date),
    type: r.type as TransactionType,
    categoryId: r.category_id ?? null,
    createdByUid: r.created_by_uid,
    createdByName: r.created_by_name,
  }
}

interface GroupContextValue {
  group: GroupInfo | null
  groupTransactions: GroupTransaction[]
  groupLoading: boolean
  createGroup: (name: string) => Promise<void>
  joinGroup: (code: string) => Promise<void>
  leaveGroup: () => Promise<void>
  addGroupTransaction: (t: Omit<GroupTransaction, 'id'>) => Promise<void>
  updateGroupTransaction: (id: string, t: Partial<Omit<GroupTransaction, 'id'>>) => Promise<void>
  deleteGroupTransaction: (id: string) => Promise<void>
}

const GroupContext = createContext<GroupContextValue | null>(null)

export function GroupProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [group, setGroup] = useState<GroupInfo | null>(null)
  const [groupTransactions, setGroupTransactions] = useState<GroupTransaction[]>([])
  const [groupLoading, setGroupLoading] = useState(true)

  async function fetchGroup(uid: string) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('group_id')
      .eq('id', uid)
      .single()

    if (!profile?.group_id) {
      setGroup(null)
      setGroupTransactions([])
      setGroupLoading(false)
      return
    }

    const groupId = profile.group_id as string

    const [groupRes, membersRes, txRes] = await Promise.all([
      supabase.from('groups').select('*').eq('id', groupId).single(),
      supabase.from('group_members').select('user_id, display_name, photo_url').eq('group_id', groupId),
      supabase.from('group_transactions').select('*').eq('group_id', groupId).order('date', { ascending: false }),
    ])

    if (!groupRes.data) {
      setGroup(null)
      setGroupLoading(false)
      return
    }

    const memberList = membersRes.data ?? []
    const members = memberList.map((m: { user_id: string }) => m.user_id)
    const memberNames: Record<string, string> = {}
    const memberPhotoURLs: Record<string, string> = {}
    for (const m of memberList) {
      const member = m as { user_id: string; display_name: string; photo_url: string | null }
      memberNames[member.user_id] = member.display_name
      if (member.photo_url) memberPhotoURLs[member.user_id] = member.photo_url
    }

    setGroup(groupFromRow(groupRes.data, members, memberNames, memberPhotoURLs))
    setGroupTransactions((txRes.data ?? []).map(gtxFromRow))
    setGroupLoading(false)
  }

  useEffect(() => {
    if (!user) {
      setGroup(null)
      setGroupTransactions([])
      setGroupLoading(false)
      return
    }
    setGroupLoading(true)
    fetchGroup(user.id)

    // Real-time: listen to group_transactions if the user is in a group
    const channel = supabase
      .channel(`group-tx-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_transactions' }, () => {
        fetchGroup(user.id)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  async function createGroup(name: string) {
    if (!user) return
    const code = generateGroupCode()

    const { data: groupData, error } = await supabase
      .from('groups')
      .insert({ name, code, created_by: user.id })
      .select()
      .single()

    if (error) throw error

    await supabase.from('group_members').insert({
      group_id: groupData.id,
      user_id: user.id,
      display_name: user.displayName,
      photo_url: user.photoURL,
    })

    await supabase.from('profiles').update({ group_id: groupData.id }).eq('id', user.id)
    await fetchGroup(user.id)
  }

  async function joinGroup(code: string) {
    if (!user) return

    const { data: groupData, error } = await supabase
      .from('groups')
      .select('id')
      .eq('code', code.trim().toUpperCase())
      .single()

    if (error || !groupData) throw new Error('Código de grupo no encontrado')

    await supabase.from('group_members').insert({
      group_id: groupData.id,
      user_id: user.id,
      display_name: user.displayName,
      photo_url: user.photoURL,
    })

    await supabase.from('profiles').update({ group_id: groupData.id }).eq('id', user.id)
    await fetchGroup(user.id)
  }

  async function leaveGroup() {
    if (!user || !group) return

    await supabase
      .from('group_members')
      .delete()
      .eq('group_id', group.id)
      .eq('user_id', user.id)

    await supabase.from('profiles').update({ group_id: null }).eq('id', user.id)
    setGroup(null)
    setGroupTransactions([])
  }

  async function addGroupTransaction(t: Omit<GroupTransaction, 'id'>) {
    if (!group) return
    const { data, error } = await supabase.from('group_transactions').insert({
      group_id: group.id,
      title: t.title,
      amount: t.amount,
      date: t.date.toISOString(),
      type: t.type,
      category_id: t.categoryId,
      created_by_uid: t.createdByUid,
      created_by_name: t.createdByName,
    }).select().single()

    if (error) throw error
    setGroupTransactions((prev) => [gtxFromRow(data), ...prev])
  }

  async function updateGroupTransaction(id: string, t: Partial<Omit<GroupTransaction, 'id'>>) {
    const patch: Record<string, unknown> = {}
    if (t.title !== undefined) patch.title = t.title
    if (t.amount !== undefined) patch.amount = t.amount
    if (t.date !== undefined) patch.date = t.date.toISOString()
    if (t.type !== undefined) patch.type = t.type
    if (t.categoryId !== undefined) patch.category_id = t.categoryId

    const { data, error } = await supabase
      .from('group_transactions').update(patch).eq('id', id).select().single()

    if (error) throw error
    setGroupTransactions((prev) => prev.map((tx) => tx.id === id ? gtxFromRow(data) : tx))
  }

  async function deleteGroupTransaction(id: string) {
    await supabase.from('group_transactions').delete().eq('id', id)
    setGroupTransactions((prev) => prev.filter((tx) => tx.id !== id))
  }

  return (
    <GroupContext.Provider value={{
      group, groupTransactions, groupLoading,
      createGroup, joinGroup, leaveGroup,
      addGroupTransaction, updateGroupTransaction, deleteGroupTransaction,
    }}>
      {children}
    </GroupContext.Provider>
  )
}

export function useGroup(): GroupContextValue {
  const ctx = useContext(GroupContext)
  if (!ctx) throw new Error('useGroup must be used within GroupProvider')
  return ctx
}
