"use client";

import { useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth";

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-foreground/70">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "h-11 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand";

const BANKS = ["신한은행", "국민은행", "우리은행", "하나은행", "농협은행", "카카오뱅크"];

function SettingsContent() {
  const { user } = useAuth();
  const [email, setEmail] = useState("demo@tirezone.example");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [notifyOptIn, setNotifyOptIn] = useState(true);
  const [address, setAddress] = useState("경기 화성시 기안동 332");
  const [contact1, setContact1] = useState(user?.phone ?? "");
  const [contact2, setContact2] = useState("");
  const [bank, setBank] = useState(BANKS[0]);
  const [accountNumber, setAccountNumber] = useState("110-306-040040");
  const [saved, setSaved] = useState(false);

  return (
    <div className="px-4 py-5">
      <h1 className="text-xl font-extrabold mb-5">회원 정보 수정</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        }}
        className="flex flex-col gap-6"
      >
        <section className="card p-5">
          <h2 className="font-bold mb-4">회원 정보</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="로그인 ID" htmlFor="s-id">
              <input id="s-id" disabled value={user?.id ?? ""} className={`${inputClass} bg-surface-2 text-muted`} />
            </Field>
            <Field label="업체명" htmlFor="s-business">
              <input
                id="s-business"
                disabled
                value={user?.businessName ?? ""}
                className={`${inputClass} bg-surface-2 text-muted`}
              />
            </Field>
            <Field label="이메일" htmlFor="s-email">
              <input
                id="s-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="휴대폰" htmlFor="s-phone">
              <input
                id="s-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted mt-4">
            <input
              type="checkbox"
              checked={notifyOptIn}
              onChange={(e) => setNotifyOptIn(e.target.checked)}
              className="w-4 h-4"
            />
            업체 알림(당일직배송 업체 홍보 알림톡/문자) 수신에 동의합니다.
          </label>
        </section>

        <section className="card p-5">
          <h2 className="font-bold mb-4">주문 / 배송 정보</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="담당자" htmlFor="s-owner">
              <input
                id="s-owner"
                disabled
                value={user?.ownerName ?? ""}
                className={`${inputClass} bg-surface-2 text-muted`}
              />
            </Field>
            <Field label="주소" htmlFor="s-address">
              <input
                id="s-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="담당자 연락처 1" htmlFor="s-contact1">
              <input
                id="s-contact1"
                value={contact1}
                onChange={(e) => setContact1(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="담당자 연락처 2" htmlFor="s-contact2">
              <input
                id="s-contact2"
                value={contact2}
                onChange={(e) => setContact2(e.target.value)}
                placeholder="선택 입력"
                className={inputClass}
              />
            </Field>
          </div>
          <p className="text-xs text-muted mt-3">
            담당자 연락처로 주문 관련 알림톡/문자가 발송됩니다.
          </p>
        </section>

        <section className="card p-5">
          <h2 className="font-bold mb-4">사업자 정보</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="사업자번호" htmlFor="s-bizno">
              <input id="s-bizno" disabled value="000-00-00000" className={`${inputClass} bg-surface-2 text-muted`} />
            </Field>
            <Field label="업체명" htmlFor="s-bizname">
              <input
                id="s-bizname"
                disabled
                value={user?.businessName ?? ""}
                className={`${inputClass} bg-surface-2 text-muted`}
              />
            </Field>
            <Field label="대표자명" htmlFor="s-ceo">
              <input
                id="s-ceo"
                disabled
                value={user?.ownerName ?? ""}
                className={`${inputClass} bg-surface-2 text-muted`}
              />
            </Field>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="font-bold mb-4">환불 / 정산 계좌</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="은행" htmlFor="s-bank">
              <select
                id="s-bank"
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                className={inputClass}
              >
                {BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="계좌번호" htmlFor="s-account">
              <input
                id="s-account"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <p className="text-xs text-success mt-3">
            예금주 {user?.ownerName ?? ""} 명의로 등록된 정상 계좌입니다.
          </p>
        </section>

        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary h-11 px-6">
            저장하기
          </button>
          {saved && <span className="text-sm text-success font-medium">저장되었습니다.</span>}
        </div>
      </form>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <RequireAuth>
      <SettingsContent />
    </RequireAuth>
  );
}
