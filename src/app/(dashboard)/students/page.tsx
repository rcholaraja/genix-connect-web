'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Eye, X, Pencil, CheckCircle } from 'lucide-react';
import dayjs from 'dayjs';
import { getStudents, addStudent, deleteStudent, updateStudent } from '@/services/students';
import { getAttendanceSummary } from '@/services/attendance';
import { getStudentFees, getCurrentMonthFeeId, markFeePaid, getFeeRecord } from '@/services/fees';
import { FEE_STATUS } from '@/constants';
import { useToast } from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const GRADES = ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12'];
const PHONE_RE = /^[6-9]\d{9}$/;

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const colors = ['#6C63FF','#4CAF50','#F44336','#FF9800','#2196F3','#9C27B0','#00BCD4','#FF5722'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, backgroundColor: color, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: size * 0.38, fontWeight: 700, flexShrink: 0 }}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

const emptyForm = { name: '', phone: '', grade: '', schoolName: '', parentName: '', parentPhone: '', feeAmount: '', dob: '', gender: '' };

export default function StudentsPage() {
  const { toast } = useToast();
  const [students, setStudents] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [feeStatusMap, setFeeStatusMap] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [selectedDetail, setSelectedDetail] = useState<any>(null);
  const [detailTab, setDetailTab] = useState<'profile' | 'attendance' | 'fees'>('profile');
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<any>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getStudents();
      setStudents(data);
      setFiltered(data);
      setLoading(false); // show list immediately, load fees in background
      const feeId = getCurrentMonthFeeId();
      const feeEntries = await Promise.all(data.map(async (s: any) => {
        try {
          const fee = await getFeeRecord(s.id, feeId);
          return [s.id, fee?.status ?? FEE_STATUS.PENDING];
        } catch (_) { return [s.id, FEE_STATUS.PENDING]; }
      }));
      setFeeStatusMap(Object.fromEntries(feeEntries));
    } catch (e) { console.error(e); setLoading(false); }
  };

  const doFilter = (q: string, grade: string, data = students) => {
    let result = data;
    if (q) result = result.filter((s: any) => s.name?.toLowerCase().includes(q.toLowerCase()) || s.phone?.includes(q) || s.grade?.toLowerCase().includes(q.toLowerCase()));
    if (grade !== 'All') result = result.filter((s: any) => s.grade === grade);
    setFiltered(result);
  };

  const handleSelect = (student: any) => {
    setSelected(student);
    setDetailTab('profile');
    setSelectedDetail(null);
    // Load fees in background (profile tab shows immediately)
    const now = dayjs();
    Promise.all([
      getAttendanceSummary(student.id, now.year(), now.month() + 1),
      getStudentFees(student.id),
    ]).then(([att, fees]) => setSelectedDetail({ att, fees })).catch(console.error);
  };

  const handleDelete = async (student: any) => {
    setConfirmDelete(student);
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteStudent(confirmDelete.id);
      toast(`${confirmDelete.name} deleted successfully`, 'success');
      setSelected(null);
      load();
    } catch (e) {
      toast('Failed to delete student', 'error');
    } finally {
      setConfirmDelete(null);
    }
  };

  const openAdd = () => { setEditingStudent(null); setForm(emptyForm); setFormError(''); setShowForm(true); };

  const openEdit = (student: any) => {
    setEditingStudent(student);
    setForm({ name: student.name ?? '', phone: student.phone ?? '', grade: student.grade ?? '', schoolName: student.schoolName ?? '', parentName: student.parentName ?? '', parentPhone: student.parentPhone ?? '', feeAmount: student.feeAmount ? String(student.feeAmount) : '', dob: student.dob ?? '', gender: student.gender ?? '' });
    setFormError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.name.trim()) { setFormError('Name is required.'); return; }
    if (!PHONE_RE.test(form.phone.trim())) { setFormError('Enter valid 10-digit mobile number starting with 6-9.'); return; }
    if (form.parentPhone && !PHONE_RE.test(form.parentPhone.trim())) { setFormError('Enter valid 10-digit parent mobile number.'); return; }
    if (!form.grade) { setFormError('Grade is required.'); return; }
    setSaving(true);
    try {
      const data = { name: form.name.trim(), phone: form.phone.trim(), grade: form.grade, schoolName: form.schoolName.trim(), parentName: form.parentName.trim(), parentPhone: form.parentPhone.trim(), feeAmount: form.feeAmount ? Number(form.feeAmount) : 0, dob: form.dob, gender: form.gender };
      if (editingStudent) {
        await updateStudent(editingStudent.id, data);
      } else {
        await addStudent(data);
      }
      setShowForm(false);
      if (editingStudent && selected?.id === editingStudent.id) {
        setSelected((s: any) => ({ ...s, ...data }));
      }
      toast(editingStudent ? 'Student updated successfully' : 'Student added successfully', 'success');
      load();
    } catch (e) { console.error(e); setFormError('Failed to save student.'); }
    finally { setSaving(false); }
  };

  const gradeCounts = GRADES.reduce((acc: any, g) => { acc[g] = students.filter((s: any) => s.grade === g).length; return acc; }, {} as any);

  const Field = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-50">
      <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value || '—'}</span>
    </div>
  );

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Students</h1>
        <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); doFilter(e.target.value, gradeFilter); }} placeholder="Search name, grade, phone..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-full sm:w-56 focus:outline-none focus:border-[#6C63FF]" />
            {search && <button onClick={() => { setSearch(''); doFilter('', gradeFilter); }} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-gray-400" /></button>}
          </div>
          <select value={gradeFilter} onChange={e => { setGradeFilter(e.target.value); doFilter(search, e.target.value); }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#6C63FF]">
            <option>All</option>
            {GRADES.map(g => <option key={g}>{g}</option>)}
          </select>
          <button onClick={openAdd} className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium transition-opacity whitespace-nowrap" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6C63FF 50%, #4F46E5 100%)' }}>
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => { setGradeFilter('All'); doFilter(search, 'All'); }} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${gradeFilter === 'All' ? 'bg-[#6C63FF] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          Total {students.length}
        </button>
        {GRADES.filter(g => gradeCounts[g] > 0).map(g => (
          <button key={g} onClick={() => { setGradeFilter(g); doFilter(search, g); }} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${gradeFilter === g ? 'bg-[#6C63FF] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {g}: {gradeCounts[g]}
          </button>
        ))}
      </div>

      <div className={`flex gap-4 ${selected ? 'md:h-[calc(100vh-180px)]' : ''}`}>
        <div className={`${selected ? 'hidden md:block md:flex-1' : 'w-full'}`}>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Name', 'Grade', 'Phone', 'Monthly Fee', 'Fee Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-400">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-400">No students found</td></tr>
                ) : filtered.map((s: any) => {
                  const feeStatus = feeStatusMap[s.id] ?? FEE_STATUS.PENDING;
                  return (
                    <tr key={s.id} onClick={() => handleSelect(s)} className={`border-b border-gray-50 hover:bg-[#6C63FF]/5 cursor-pointer transition-colors ${selected?.id === s.id ? 'bg-[#6C63FF]/10' : ''}`}>
                      <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={s.name} size={32} /><span className="font-medium text-gray-800 text-sm">{s.name}</span></div></td>
                      <td className="px-4 py-3 text-sm text-gray-600">{s.grade}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{s.phone}</td>
                      <td className="px-4 py-3 text-sm text-gray-800 font-medium">₹{s.feeAmount ?? 0}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${feeStatus === FEE_STATUS.PAID ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{feeStatus === FEE_STATUS.PAID ? 'Paid' : 'Pending'}</span></td>
                      <td className="px-4 py-3"><div className="flex items-center gap-2" onClick={e => e.stopPropagation()}><button onClick={() => openEdit(s)} className="p-1 hover:bg-gray-100 rounded"><Pencil className="w-4 h-4 text-gray-400" /></button><button onClick={() => handleSelect(s)} className="p-1 hover:bg-gray-100 rounded"><Eye className="w-4 h-4 text-gray-400" /></button><button onClick={() => handleDelete(s)} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" /></button></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {loading ? <div className="bg-white rounded-xl p-8 text-center text-gray-400">Loading...</div> :
              filtered.length === 0 ? <div className="bg-white rounded-xl p-8 text-center text-gray-400">No students found</div> :
              filtered.map((s: any) => {
                const feeStatus = feeStatusMap[s.id] ?? FEE_STATUS.PENDING;
                return (
                  <div key={s.id} onClick={() => handleSelect(s)} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer active:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar name={s.name} size={40} />
                        <div>
                          <p className="font-semibold text-gray-800">{s.name}</p>
                          <p className="text-xs text-gray-400">{s.grade} · {s.phone}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${feeStatus === FEE_STATUS.PAID ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{feeStatus === FEE_STATUS.PAID ? 'Paid' : 'Pending'}</span>
                        <span className="text-xs font-semibold text-gray-700">₹{s.feeAmount ?? 0}/mo</span>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-3 border-t border-gray-50 pt-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openEdit(s)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg"><Pencil className="w-3.5 h-3.5" /> Edit</button>
                      <button onClick={() => handleSelect(s)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-[#6C63FF] hover:bg-[#6C63FF]/5 rounded-lg"><Eye className="w-3.5 h-3.5" /> View</button>
                      <button onClick={() => handleDelete(s)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>

        {/* Detail panel — side panel on desktop, modal on mobile */}
        {selected && (
          <>
            {/* Mobile modal backdrop */}
            <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setSelected(null)} />
            <div className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-xl">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <span className="font-semibold text-gray-800">Student Profile</span>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(selected)} className="p-1.5 hover:bg-gray-100 rounded"><Pencil className="w-4 h-4 text-[#6C63FF]" /></button>
                  <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-gray-100 rounded"><X className="w-4 h-4 text-gray-500" /></button>
                </div>
              </div>
              <div className="flex flex-col items-center py-4 border-b border-gray-100">
                <Avatar name={selected.name} size={48} />
                <p className="font-bold text-gray-900 mt-2">{selected.name}</p>
                <p className="text-gray-500 text-sm">{selected.grade}</p>
              </div>
              <div className="flex border-b border-gray-100">
                {(['profile', 'attendance', 'fees'] as const).map(t => (
                  <button key={t} onClick={() => setDetailTab(t)} className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors ${detailTab === t ? 'border-b-2 border-[#6C63FF] text-[#6C63FF]' : 'text-gray-500'}`}>{t}</button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {detailTab === 'profile' && (
                  <div className="space-y-1">
                    <Field label="Phone" value={selected.phone} />
                    <Field label="Date of Birth" value={selected.dob ? dayjs(selected.dob).format('D MMM YYYY') : ''} />
                    <Field label="Gender" value={selected.gender === 'male' ? '👦 Male' : selected.gender === 'female' ? '👧 Female' : ''} />
                    <Field label="School" value={selected.schoolName} />
                    <Field label="Grade" value={selected.grade} />
                    <Field label="Parent Name" value={selected.parentName} />
                    <Field label="Parent Mobile" value={selected.parentPhone} />
                    <Field label="Monthly Fee" value={`₹${selected.feeAmount ?? 0}`} />
                  </div>
                )}
                {detailTab === 'attendance' && (
                  <div>
                    <p className="text-sm font-semibold text-gray-600 mb-3">{dayjs().format('MMMM YYYY')}</p>
                    {selectedDetail ? (
                      <div className="grid grid-cols-4 gap-2">
                        {([['Present', selectedDetail.att.present, '#4CAF50'], ['Absent', selectedDetail.att.absent, '#F44336'], ['Leave', selectedDetail.att.leave, '#FFC107'], ['%', selectedDetail.att.total > 0 ? `${Math.round(selectedDetail.att.present / selectedDetail.att.total * 100)}%` : '0%', '#6C63FF']] as [string, any, string][]).map(([l, v, c]) => (
                          <div key={l} className="bg-gray-50 rounded-lg p-3 text-center">
                            <p className="text-xl font-bold" style={{ color: c }}>{v}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{l}</p>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-gray-400 text-sm">Loading...</p>}
                  </div>
                )}
                {detailTab === 'fees' && (
                  <div className="space-y-2">
                    {!selectedDetail ? <p className="text-gray-400 text-sm">Loading...</p> :
                      selectedDetail.fees.length === 0 ? <p className="text-gray-400 text-sm">No fee records yet.</p> :
                        selectedDetail.fees.map((fee: any) => (
                          <div key={fee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="text-sm font-medium text-gray-800">{dayjs(fee.id + '-01').format('MMMM YYYY')}</p>
                              {fee.paidDate && <p className="text-xs text-gray-400">Paid {dayjs(fee.paidDate).format('D MMM')}</p>}
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${fee.status === FEE_STATUS.PAID ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{fee.status === FEE_STATUS.PAID ? 'Paid' : 'Pending'}</span>
                          </div>
                        ))
                    }
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-gray-100">
                {feeStatusMap[selected.id] === FEE_STATUS.PAID ? (
                  <div className="w-full flex items-center justify-center gap-2 bg-green-50 text-green-700 py-2 rounded-lg text-sm font-medium border border-green-200">
                    <CheckCircle className="w-4 h-4" /> Fee Paid for {dayjs().format('MMMM')}
                  </div>
                ) : (
                  <button onClick={() => markFeePaid(selected.id, getCurrentMonthFeeId(), selected.feeAmount ?? 0, 'teacher').then(() => { load(); toast('Fee marked as paid', 'success'); })} className="w-full text-white py-2 rounded-lg text-sm font-medium" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6C63FF 50%, #4F46E5 100%)' }}>
                    Mark Fee Paid
                  </button>
                )}
              </div>
            </div>

            {/* Desktop side panel */}
            <div className="hidden md:flex w-96 bg-white rounded-xl shadow-sm border border-gray-100 flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <span className="font-semibold text-gray-800">Student Profile</span>
              <div className="flex gap-2">
                <button onClick={() => openEdit(selected)} className="p-1.5 hover:bg-gray-100 rounded" title="Edit"><Pencil className="w-4 h-4 text-[#6C63FF]" /></button>
                <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-gray-100 rounded"><X className="w-4 h-4 text-gray-500" /></button>
              </div>
            </div>
            <div className="flex flex-col items-center py-5 border-b border-gray-100">
              <Avatar name={selected.name} size={56} />
              <p className="font-bold text-gray-900 mt-2">{selected.name}</p>
              <p className="text-gray-500 text-sm">{selected.grade}</p>
            </div>
            <div className="flex border-b border-gray-100">
              {(['profile', 'attendance', 'fees'] as const).map(t => (
                <button key={t} onClick={() => setDetailTab(t)} className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors ${detailTab === t ? 'border-b-2 border-[#6C63FF] text-[#6C63FF]' : 'text-gray-500 hover:text-gray-700'}`}>{t}</button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {detailTab === 'profile' && (
                <div className="space-y-1">
                  <Field label="Phone" value={selected.phone} />
                  <Field label="Date of Birth" value={selected.dob ? dayjs(selected.dob).format('D MMM YYYY') : ''} />
                  <Field label="Gender" value={selected.gender === 'male' ? '👦 Male' : selected.gender === 'female' ? '👧 Female' : ''} />
                  <Field label="School" value={selected.schoolName} />
                  <Field label="Grade" value={selected.grade} />
                  <Field label="Parent Name" value={selected.parentName} />
                  <Field label="Parent Mobile" value={selected.parentPhone} />
                  <Field label="Monthly Fee" value={`₹${selected.feeAmount ?? 0}`} />
                </div>
              )}
              {detailTab === 'attendance' && (
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-3">{dayjs().format('MMMM YYYY')}</p>
                  {selectedDetail ? (
                    <div className="grid grid-cols-4 gap-2">
                      {([['Present', selectedDetail.att.present, '#4CAF50'], ['Absent', selectedDetail.att.absent, '#F44336'], ['Leave', selectedDetail.att.leave, '#FFC107'], ['%', selectedDetail.att.total > 0 ? `${Math.round(selectedDetail.att.present / selectedDetail.att.total * 100)}%` : '0%', '#6C63FF']] as [string, any, string][]).map(([l, v, c]) => (
                        <div key={l} className="bg-gray-50 rounded-lg p-3 text-center">
                          <p className="text-xl font-bold" style={{ color: c }}>{v}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{l}</p>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-gray-400 text-sm">Loading...</p>}
                </div>
              )}
              {detailTab === 'fees' && (
                <div className="space-y-2">
                  {!selectedDetail ? <p className="text-gray-400 text-sm">Loading...</p> :
                    selectedDetail.fees.length === 0 ? <p className="text-gray-400 text-sm">No fee records yet.</p> :
                      selectedDetail.fees.map((fee: any) => (
                        <div key={fee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{dayjs(fee.id + '-01').format('MMMM YYYY')}</p>
                            {fee.paidDate && <p className="text-xs text-gray-400">Paid {dayjs(fee.paidDate).format('D MMM')}</p>}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${fee.status === FEE_STATUS.PAID ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {fee.status === FEE_STATUS.PAID ? 'Paid' : 'Pending'}
                          </span>
                        </div>
                      ))
                  }
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100">
              {feeStatusMap[selected.id] === FEE_STATUS.PAID ? (
                <div className="w-full flex items-center justify-center gap-2 bg-green-50 text-green-700 py-2 rounded-lg text-sm font-medium border border-green-200">
                  <CheckCircle className="w-4 h-4" /> Fee Paid for {dayjs().format('MMMM')}
                </div>
              ) : (
                <button onClick={() => markFeePaid(selected.id, getCurrentMonthFeeId(), selected.feeAmount ?? 0, 'teacher').then(() => { load(); toast('Fee marked as paid', 'success'); })} className="w-full text-white py-2 rounded-lg text-sm font-medium" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6C63FF 50%, #4F46E5 100%)' }}>
                  Mark Fee Paid
                </button>
              )}
            </div>
            </div>
          </>
        )}
      </div>

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">{editingStudent ? 'Edit Student' : 'Add Student'}</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Full Name *</label>
                <input type="text" placeholder="e.g. Ajay Kumar" value={form.name} maxLength={60}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#6C63FF]" />
              </div>
              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Mobile Number *</label>
                <div className="flex border border-gray-200 rounded-lg overflow-hidden focus-within:border-[#6C63FF]">
                  <span className="flex items-center px-3 bg-gray-50 border-r border-gray-200 text-sm text-gray-600 shrink-0">🇮🇳 +91</span>
                  <input type="tel" inputMode="numeric" placeholder="98765 43210" value={form.phone} maxLength={10}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    className="flex-1 px-3 py-2 text-sm outline-none bg-white" />
                </div>
                {form.phone && !/^[6-9]\d{9}$/.test(form.phone) && <p className="text-xs text-amber-500 mt-1">Must be a valid 10-digit Indian mobile number</p>}
              </div>
              {/* School */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">School Name</label>
                <input type="text" placeholder="e.g. St. Mary's School" value={form.schoolName} maxLength={80}
                  onChange={e => setForm(f => ({ ...f, schoolName: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#6C63FF]" />
              </div>
              {/* Parent Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Parent Name</label>
                <input type="text" placeholder="e.g. Hari Prasad" value={form.parentName} maxLength={60}
                  onChange={e => setForm(f => ({ ...f, parentName: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#6C63FF]" />
              </div>
              {/* Parent Phone */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Parent Mobile</label>
                <div className="flex border border-gray-200 rounded-lg overflow-hidden focus-within:border-[#6C63FF]">
                  <span className="flex items-center px-3 bg-gray-50 border-r border-gray-200 text-sm text-gray-600 shrink-0">🇮🇳 +91</span>
                  <input type="tel" inputMode="numeric" placeholder="98765 43210" value={form.parentPhone} maxLength={10}
                    onChange={e => setForm(f => ({ ...f, parentPhone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    className="flex-1 px-3 py-2 text-sm outline-none bg-white" />
                </div>
                {form.parentPhone && !/^[6-9]\d{9}$/.test(form.parentPhone) && <p className="text-xs text-amber-500 mt-1">Must be a valid 10-digit Indian mobile number</p>}
              </div>
              {/* Fee */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Monthly Fee (₹)</label>
                <div className="flex border border-gray-200 rounded-lg overflow-hidden focus-within:border-[#6C63FF]">
                  <span className="flex items-center px-3 bg-gray-50 border-r border-gray-200 text-sm text-gray-600 shrink-0">₹</span>
                  <input type="text" inputMode="numeric" placeholder="e.g. 1500" value={form.feeAmount} maxLength={6}
                    onChange={e => setForm(f => ({ ...f, feeAmount: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                    className="flex-1 px-3 py-2 text-sm outline-none bg-white" />
                </div>
                {form.feeAmount && Number(form.feeAmount) > 50000 && <p className="text-xs text-amber-500 mt-1">Fee seems unusually high — please verify</p>}
              </div>
              {/* DOB */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Date of Birth</label>
                <input type="date" value={form.dob} max={dayjs().format('YYYY-MM-DD')}
                  onChange={e => setForm(f => ({ ...f, dob: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#6C63FF]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Grade *</label>
                <select value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#6C63FF]">
                  <option value="">Select grade...</option>
                  {GRADES.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Gender</label>
                <div className="flex gap-3">
                  {['male', 'female'].map(g => (
                    <button key={g} onClick={() => setForm(f => ({ ...f, gender: g }))} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${form.gender === g ? 'border-[#6C63FF] bg-[#6C63FF]/5 text-[#6C63FF]' : 'border-gray-200 text-gray-500'}`}>
                      {g === 'male' ? '👦 Male' : '👧 Female'}
                    </button>
                  ))}
                </div>
              </div>
              {formError && <p className="text-red-500 text-sm">{formError}</p>}
              <button onClick={handleSave} disabled={saving} className="w-full text-white py-2.5 rounded-lg font-medium disabled:opacity-60 transition-opacity" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6C63FF 50%, #4F46E5 100%)' }}>
                {saving ? 'Saving...' : editingStudent ? 'Update Student' : 'Save Student'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Student"
        message={`Remove ${confirmDelete?.name} from the system? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
