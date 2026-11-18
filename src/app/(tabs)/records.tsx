import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { MedicalRecord } from '@/lib/types';
import PatientLookupModule from '@/screens/modules/PatientLookupModule';
import { prettyDateTime, titleCase } from '@/lib/format';
import { theme } from '@/lib/theme';
import { Button, Card, Chip, EmptyState, PageTitle, Screen, TextField, Loader } from '@/components/ui';

export default function RecordsScreen(){
  const {user,token,refreshUser}=useAuth();const [items,setItems]=useState<MedicalRecord[]>([]);const [card,setCard]=useState('');const [patientName,setPatientName]=useState('');const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const patient=user?.role==='patient';
  const load=useCallback(async(refresh=false)=>{if(!token)return;if(patient){if(!refresh)setLoading(true);setError('');try{setItems(await api.get<MedicalRecord[]>('/records/my',token));}catch(e:any){setError(e.message);}finally{setLoading(false);}}else if(!refresh)setLoading(false);},[token,patient]);
  useFocusEffect(useCallback(()=>{load();},[load]));
  const search=async()=>{setError('');if(!card.trim()){setError('Enter the patient ID card number.');return;}try{setBusy(true);const response=await api.get<{patient:{name:string};records:MedicalRecord[]}>(`/records/patient/${encodeURIComponent(card.trim().toUpperCase())}`,token);setPatientName(response.patient.name);setItems(response.records);}catch(e:any){setItems([]);setPatientName('');setError(e.message||'Patient lookup failed.');}finally{setBusy(false);}};
  const openRecord=(item:MedicalRecord)=>{const pathname=item.type==='lab_report'&&item.file?'/file-viewer':'/record-viewer';router.push({pathname,params:{recordId:item._id,title:item.title}});};
  if(loading)return <Screen><Loader label="Loading medical records…"/></Screen>;
  if(user?.role==='medicine_manager')return <Screen onRefresh={refreshUser}><PageTitle title="Clinical records" subtitle="This workspace is limited to patient, doctor, laboratory and administrator accounts."/><Card><EmptyState title="No clinical-record access" message="Your medicine inventory tools are available in the Work tab. Patient health records are protected by clinical access rules." icon="lock-closed-outline"/></Card></Screen>;
  if(!patient)return <PatientLookupModule/>;
  return <Screen onRefresh={()=>load(true)}><PageTitle title={patient?'My health records':'Patient records'} subtitle={patient?'Your reports and prescriptions, together in one place.':'Search only for patients you are authorized to access.'}/>
    {!patient?<Card><TextField label="Patient ID card number" placeholder="Enter patient ID card" value={card} onChangeText={setCard} autoCapitalize="characters"/><Button title="Search patient records" onPress={search} loading={busy} icon="search"/>{error?<Text style={styles.error}>{error}</Text>:null}{patientName?<Text style={styles.patientName}>Showing records for {patientName}</Text>:null}</Card>:null}
    {patient&&error?<Text style={styles.error}>{error}</Text>:null}
    {items.length===0?<Card><EmptyState title="No records found" message={patient?'Your uploaded reports and prescriptions will appear here.':'Search for an authorized patient to view their records.'} icon="folder-open-outline"/></Card>:items.map(item=><Pressable
      key={item._id}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.type === 'prescription' ? 'prescription' : 'lab report'}: ${item.title}`}
      onPress={() => openRecord(item)}
      style={({ pressed }) => pressed ? styles.recordPressed : undefined}
    ><Card>
      <View style={styles.recordTop}><View style={styles.recordIcon}><Ionicons name={item.type==='prescription'?'document-text-outline':'flask-outline'} size={21} color={theme.colors.primary}/></View><View style={{flex:1,gap:3}}><Text style={styles.recordTitle}>{item.title}</Text><Text style={styles.meta}>{titleCase(item.type)} · {prettyDateTime(item.recordedAt)}</Text></View><Chip label={item.type==='prescription'?'Prescription':'Lab report'} tone={item.type==='prescription'?'info':'neutral'}/><Ionicons name="chevron-forward" size={18} color={theme.colors.muted}/></View>
      {item.diagnosis?<Text style={styles.bodyText}>{item.diagnosis}</Text>:null}{item.notes?<Text style={styles.meta}>{item.notes}</Text>:null}
      {item.aiPrediction?.result?<View style={styles.aiBox}><Ionicons name="sparkles" color={theme.colors.primary} size={17}/><View style={{flex:1,gap:2}}><Text style={styles.recordTitle}>AI insight: {item.aiPrediction.result.prediction||'Prediction available'}</Text><Text style={styles.meta}>Model confidence: {typeof item.aiPrediction.result.confidence==='number'?`${(item.aiPrediction.result.confidence*100).toFixed(1)}%`:'Not provided'}</Text><Text style={styles.aiDisclaimer}>Decision-support output only. Not a medical diagnosis.</Text></View></View>:item.aiPrediction?.status==='failed'?<Chip label="AI analysis unavailable" tone="warning"/>:null}
      {item.medicines?.length? <View style={{gap:6}}>{item.medicines.map((m,i)=><Text key={i} style={styles.meta}>• {m.name} {m.dosage?`— ${m.dosage}`:''} {m.frequency?`· ${m.frequency}`:''}</Text>)}</View>:null}
    </Card></Pressable>)}
    {user?.role==='doctor'?<Button title="Create prescription" icon="add-circle-outline" onPress={()=>router.push('/module/prescription')}/>:null}
    {user?.role==='diagnosis_lab_manager'||user?.role==='admin'?<Button title="Upload lab report" icon="cloud-upload-outline" onPress={()=>router.push('/module/upload-report')}/>:null}
  </Screen>;
}
const styles=StyleSheet.create({recordTop:{flexDirection:'row',alignItems:'center',gap:10},recordIcon:{width:42,height:42,borderRadius:14,backgroundColor:theme.colors.background,alignItems:'center',justifyContent:'center'},recordTitle:{fontSize:14,fontWeight:'800',color:theme.colors.ink},meta:{fontSize:11,color:theme.colors.muted,lineHeight:17},bodyText:{fontSize:13,color:theme.colors.ink,lineHeight:19},aiBox:{backgroundColor:'#E9F7F8',borderRadius:13,padding:11,flexDirection:'row',gap:8},aiDisclaimer:{fontSize:10,color:theme.colors.muted,lineHeight:14},error:{color:theme.colors.danger,fontSize:12},patientName:{fontSize:12,color:theme.colors.primary,fontWeight:'800'},recordPressed:{opacity:0.86}});
