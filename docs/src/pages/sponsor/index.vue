<script setup lang="ts">
import type { TabsProps } from 'antdv-next'
import { AlipayCircleOutlined, GithubOutlined, TeamOutlined, UserOutlined, WechatOutlined } from '@antdv-next/icons'
import dayjs from 'dayjs'
import { h, onMounted, onUnmounted, reactive, shallowRef, watch } from 'vue'

// 当前 tab
const activeTab = shallowRef('org')

// Tabs items 配置
const tabItems: TabsProps['items'] = [
  {
    key: 'org',
    label: '赞助团队',
    icon: () => h(TeamOutlined),
  },
  {
    key: 'personal',
    label: '赞助个人',
    icon: () => h(UserOutlined),
  },
]

// 团队成员信息
const teamMembers = [
  {
    github: 'aibayanyu20',
    name: 'aibayanyu20',
    avatar: 'https://avatars.githubusercontent.com/u/45655660?v=4',
    wxCode: 'wxp://f2f0CAPw6HcV3Vm85wFYpEJZHONHoQklOWd6vXe4Z0udKvA',
    alipayCode: 'https://qr.alipay.com/2m614380prbpz28lwb4t863',
  },
  {
    github: 'selicens',
    name: 'selicens',
    avatar: 'https://avatars.githubusercontent.com/u/69418751?v=4',
    wxCode: '',
    alipayCode: '',
  },
  {
    github: 'cc-hearts',
    name: 'cc-hearts',
    avatar: 'https://avatars.githubusercontent.com/u/71313168?v=4',
    wxCode: '',
    alipayCode: '',
  },
  {
    github: 'ffgenius',
    name: 'ffgenius',
    avatar: 'https://avatars.githubusercontent.com/u/106022674?v=4',
    wxCode: 'wxp://f2f0WLYuzNeJ37fJ8ggT1-a3KwOGGIm4kM3mQ7Ti6dhEvuw',
    alipayCode: 'https://qr.alipay.com/fkx16048xvbk55pvxz8ev6b',
  },
  {
    github: 'Darkingtail',
    name: 'darkingtail',
    avatar: 'https://avatars.githubusercontent.com/u/51188676?v=4',
    wxCode: 'wxp://f2f0x9VQ7XaFm__iV8Vu9Apg1KCD6f6DY9UWCacpoCaTKYYa1absGX_lf933xeCmhd-c',
    alipayCode: 'https://qr.alipay.com/fkx11381rbbef2e82zl106a',
  },
  {
    github: 'shiqkuangsan',
    name: 'shiqkuangsan',
    avatar: 'https://avatars.githubusercontent.com/u/18481623?v=4',
    wxCode: 'wxp://f2f0D7y2n_8NxFIDidgAElzg901GrmtaCaGPELRzYx_EkA8',
    alipayCode: 'https://qr.alipay.com/fkx16811xjmckbz86jyoa62',
  },
]

interface SponsorForm {
  amount: number | string
  subject: string
  payType: 'alipay' | 'wechat'
  sponsorName?: string
  sponsorEmail?: string
  sponsorMessage?: string
  invoiceRequired?: boolean
  invoiceCompany?: string
  invoiceTaxNo?: string
  invoiceEmail?: string
}

// 组织赞助表单
const orgSponsorForm = reactive<SponsorForm>({
  amount: 20,
  subject: 'Antdv Next 项目赞助',
  payType: 'alipay',
  sponsorName: '',
  sponsorEmail: '',
  sponsorMessage: '',
  invoiceRequired: false,
  invoiceCompany: '',
  invoiceTaxNo: '',
  invoiceEmail: '',
})

const customInputStyles = {
  input: {
    textAlign: 'center',
    fontWeight: 700,
    fontSize: '16px',
  },
}

// 赞助列表
const sponsorList = shallowRef<any[]>([])
const sponsorTotal = shallowRef(0)
const sponsorLoading = shallowRef(false)
const sponsorPagination = reactive({ page: 1, pageSize: 10 })

const submitUrl = 'https://test-pay.lingyu.org.cn'

async function fetchSponsors() {
  sponsorLoading.value = true
  try {
    const res = await fetch(`${submitUrl}/sponsor/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: sponsorPagination.page, pageSize: sponsorPagination.pageSize }),
    })
    const { data } = await res.json()
    if (data) {
      sponsorList.value = data.items || []
      sponsorTotal.value = data.total || 0
    }
  }
  catch (e) {
    console.error('获取赞助列表失败', e)
  }
  finally {
    sponsorLoading.value = false
  }
}

function handleSponsorPageChange(page: number, pageSize: number) {
  sponsorPagination.page = page
  sponsorPagination.pageSize = pageSize
  fetchSponsors()
}

const sponsorColumns = [
  { title: '赞助人', dataIndex: 'sponsorName', key: 'sponsorName' },
  { title: '金额', dataIndex: 'amount', key: 'amount', width: 120 },
  { title: '留言', dataIndex: 'sponsorMessage', key: 'sponsorMessage', ellipsis: true },
  { title: '时间', dataIndex: 'paidAt', key: 'paidAt', width: 180 },
]

const wechatPayVisible = shallowRef(false)
const wechatPayCodeUrl = shallowRef('')
const wechatPayOrderNo = shallowRef('')
const wechatPayStatus = shallowRef<'idle' | 'pending' | 'timeout' | 'error'>('idle')
const wechatPayQuerying = shallowRef(false)
const wechatPayError = shallowRef('')
const WECHAT_POLL_INTERVAL = 5000
const WECHAT_MAX_POLL_COUNT = 120
let wechatPollTimer: ReturnType<typeof setTimeout> | null = null
let wechatPollCount = 0

function getSuccessPath(orderNo: string) {
  const path = window.location.pathname.includes('/sponsor-cn') ? '/sponsor/success-cn' : '/sponsor/success'
  return `${path}?out_trade_no=${encodeURIComponent(orderNo)}`
}

function stopWechatPayPoll() {
  if (wechatPollTimer) {
    clearTimeout(wechatPollTimer)
    wechatPollTimer = null
  }
}

function closeWechatPayModal() {
  wechatPayVisible.value = false
  stopWechatPayPoll()
  wechatPayCodeUrl.value = ''
  wechatPayOrderNo.value = ''
  wechatPayStatus.value = 'idle'
  wechatPayQuerying.value = false
  wechatPayError.value = ''
}

async function queryWechatPayment() {
  if (!wechatPayOrderNo.value || wechatPayQuerying.value) {
    return false
  }

  wechatPayQuerying.value = true
  try {
    const res = await fetch(`${submitUrl}/pay/query?orderNo=${encodeURIComponent(wechatPayOrderNo.value)}`)
    const { code, data } = await res.json()

    if (code === 0 && data) {
      if (data.paid || data.status === 'paid') {
        stopWechatPayPoll()
        window.location.href = getSuccessPath(wechatPayOrderNo.value)
        return true
      }

      if (data.status === 'pending') {
        wechatPayStatus.value = 'pending'
        wechatPayError.value = ''
        return false
      }
    }

    wechatPayStatus.value = 'error'
    wechatPayError.value = '支付状态异常，请稍后重新查询'
    stopWechatPayPoll()
    return true
  }
  catch (error) {
    console.error('查询微信支付状态失败', error)
    wechatPayStatus.value = 'error'
    wechatPayError.value = '支付状态查询失败，请稍后重试'
    stopWechatPayPoll()
    return true
  }
  finally {
    wechatPayQuerying.value = false
  }
}

function scheduleWechatPayPoll() {
  stopWechatPayPoll()
  if (!wechatPayVisible.value || !wechatPayOrderNo.value) {
    return
  }
  if (wechatPollCount >= WECHAT_MAX_POLL_COUNT) {
    wechatPayStatus.value = 'timeout'
    wechatPayError.value = '等待支付确认超时，您可以完成支付后手动刷新状态'
    return
  }

  wechatPollTimer = setTimeout(async () => {
    wechatPollCount += 1
    const finished = await queryWechatPayment()
    if (!finished) {
      scheduleWechatPayPoll()
    }
  }, WECHAT_POLL_INTERVAL)
}

function startWechatPayPoll(orderNo: string) {
  wechatPayOrderNo.value = orderNo
  wechatPayStatus.value = 'pending'
  wechatPayError.value = ''
  wechatPollCount = 0
  scheduleWechatPayPoll()
}

async function refreshWechatPayment() {
  const finished = await queryWechatPayment()
  if (!finished && wechatPayVisible.value && !wechatPollTimer) {
    scheduleWechatPayPoll()
  }
}

function getSubmitRequest() {
  const url = `${submitUrl}/pay/page`
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: orgSponsorForm.amount,
      subject: orgSponsorForm.subject,
      payType: orgSponsorForm.payType,
      ...(orgSponsorForm.payType === 'wechat' ? { tradeType: 'native' } : {}),
      sponsorName: orgSponsorForm.sponsorName,
      sponsorEmail: orgSponsorForm.sponsorEmail,
      sponsorMessage: orgSponsorForm.sponsorMessage,
      invoiceRequired: orgSponsorForm.invoiceRequired,
      invoiceCompany: orgSponsorForm.invoiceCompany,
      invoiceTaxNo: orgSponsorForm.invoiceTaxNo,
      invoiceEmail: orgSponsorForm.invoiceEmail,
    }),
  })
}

const submitting = shallowRef(false)

async function handleOrgSponsorSubmit() {
  if (submitting.value)
    return
  submitting.value = true
  try {
    const res = await getSubmitRequest()
    const { code, data } = await res.json()
    if (code !== 0 || !data) {
      return
    }

    if (orgSponsorForm.payType === 'alipay' && data.url) {
      window.open(data.url, '_blank')
      return
    }

    if (orgSponsorForm.payType === 'wechat' && data.codeUrl && data.orderNo) {
      wechatPayCodeUrl.value = data.codeUrl
      wechatPayVisible.value = true
      startWechatPayPoll(data.orderNo)
    }
  }
  finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchSponsors()
})

onUnmounted(() => {
  stopWechatPayPoll()
})

watch(wechatPayVisible, (visible) => {
  if (!visible) {
    stopWechatPayPoll()
  }
})

const amountOptions = [
  { label: '¥10', value: 10 },
  { label: '¥20', value: 20 },
  { label: '¥30', value: 30 },
  { label: '¥50', value: 50 },
  { label: '¥100', value: 100 },
]
</script>

<template>
  <div class="sponsor-page">
    <div class="sponsor-container">
      <!-- 页面标题 -->
      <div class="sponsor-header">
        <h1 class="sponsor-title">
          支持我们的创作与发展
        </h1>
        <p class="sponsor-desc">
          您的支持是 Antdv Next 持续输出高质量内容的动力
        </p>
      </div>

      <!-- Tabs 切换 -->
      <a-tabs v-model:active-key="activeTab" :items="tabItems" centered size="large" class="sponsor-tabs">
        <template #contentRender="{ item }">
          <!-- 组织赞助内容 -->
          <div v-if="item.key === 'org'" class="tab-content">
            <div class="content-card">
              <a-alert class="mb-24px!" type="info" show-icon>
                <template #message>
                  所有赞助资金将优先投入服务器等运营成本，结余部分将以公开透明的方式用于团队支持及社区贡献激励。
                </template>
              </a-alert>

              <a-form layout="vertical" class="org-sponsor-form">
                <a-form-item label="赞助金额">
                  <div class="amount-grid">
                    <button
                      v-for="opt in amountOptions"
                      :key="opt.value"
                      class="amount-btn"
                      :class="{ active: orgSponsorForm.amount === opt.value }"
                      @click="orgSponsorForm.amount = opt.value"
                    >
                      {{ opt.label }}
                    </button>
                  </div>
                  <div class="amount-grid mt-12px">
                    <a-input-number
                      v-model:value="orgSponsorForm.amount"
                      :min="1"
                      :step="1"
                      :controls="false"
                      prefix="¥"
                      suffix="元"
                      :styles="customInputStyles"
                      class="custom-amount-input"
                      placeholder="自定义金额"
                    />
                  </div>
                </a-form-item>

                <a-form-item label="赞助人">
                  <a-input
                    v-model:value="orgSponsorForm.sponsorName"
                    placeholder="方便的话，留个称呼让我们感谢您~"
                  />
                </a-form-item>

                <a-form-item label="留言">
                  <a-textarea
                    v-model:value="orgSponsorForm.sponsorMessage"
                    placeholder="您的每一句话都是我们前进的动力~"
                    :auto-size="{ minRows: 3, maxRows: 5 }"
                  />
                </a-form-item>

                <a-form-item label="支付方式">
                  <a-radio-group v-model:value="orgSponsorForm.payType">
                    <a-radio value="alipay">
                      <a-space>
                        <AlipayCircleOutlined class="text-18px" style="color: #1677ff" />
                        支付宝
                      </a-space>
                    </a-radio>
                    <a-radio value="wechat">
                      <a-space>
                        <WechatOutlined class="text-18px" style="color: #07c160" />
                        微信支付
                      </a-space>
                    </a-radio>
                  </a-radio-group>
                </a-form-item>

                <a-form-item>
                  <a-checkbox v-model:checked="orgSponsorForm.invoiceRequired">
                    需要开具发票
                  </a-checkbox>
                </a-form-item>

                <!-- 发票信息（仅勾选需要发票时显示） -->
                <template v-if="orgSponsorForm.invoiceRequired">
                  <div class="invoice-section">
                    <div class="invoice-header">
                      <span class="invoice-title">发票信息</span>
                      <a-tag color="green">
                        支持电子普票
                      </a-tag>
                    </div>
                    <a-form-item label="公司/组织名称">
                      <a-input
                        v-model:value="orgSponsorForm.invoiceCompany"
                        placeholder="请填写公司全称，用作发票抬头~"
                      />
                    </a-form-item>
                    <a-form-item label="税号">
                      <a-input
                        v-model:value="orgSponsorForm.invoiceTaxNo"
                        placeholder="统一社会信用代码，麻烦您啦~"
                      />
                    </a-form-item>
                    <a-form-item label="接收邮箱">
                      <a-input
                        v-model:value="orgSponsorForm.invoiceEmail"
                        placeholder="电子发票将发送到这里~"
                      />
                    </a-form-item>
                  </div>
                </template>

                <a-form-item>
                  <a-button type="primary" size="large" block class="submit-btn" :loading="submitting" @click="handleOrgSponsorSubmit">
                    立即赞助
                  </a-button>
                </a-form-item>
              </a-form>

              <!-- 赞助列表 -->
              <a-divider>感谢以下股东的赞助和支持</a-divider>
              <a-table
                :columns="sponsorColumns"
                :data-source="sponsorList"
                :loading="sponsorLoading"
                :pagination="{
                  current: sponsorPagination.page,
                  pageSize: sponsorPagination.pageSize,
                  total: sponsorTotal,
                  showSizeChanger: true,
                  showTotal: (total: number) => `共 ${total} 条`,
                }"
                row-key="orderNo"
                size="middle"
                @change="(pag: any) => handleSponsorPageChange(pag.current, pag.pageSize)"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'sponsorName'">
                    {{ record.sponsorName || '匿名好心人' }}
                  </template>
                  <template v-else-if="column.key === 'amount'">
                    <span class="sponsor-amount">¥{{ record.amount }}</span>
                  </template>
                  <template v-else-if="column.key === 'sponsorMessage'">
                    {{ record.sponsorMessage || '-' }}
                  </template>
                  <template v-else-if="column.key === 'paidAt'">
                    {{ record.paidAt ? dayjs(record.paidAt).format('YYYY-MM-DD') : '-' }}
                  </template>
                </template>
              </a-table>
            </div>
          </div>

          <!-- 个人赞助内容 -->
          <div v-else-if="item.key === 'personal'" class="tab-content">
            <div class="content-card">
              <a-alert
                type="info"
                show-icon
                class="mb-24px!"
                message="个人赞助将直接归属于被赞助者本人，组织仅提供平台支持，不参与任何个人赞助资金的管理与分配。"
              />

              <div class="team-members">
                <a-card
                  v-for="member in teamMembers"
                  :key="member.github"
                  class="member-card"
                  hoverable
                >
                  <div class="member-content">
                    <a-avatar :src="member.avatar" :size="80" />
                    <h3 class="member-name">
                      {{ member.name }}
                    </h3>
                    <a
                      :href="`https://github.com/${member.github}`"
                      target="_blank"
                      rel="noreferrer"
                      class="member-github"
                    >
                      <GithubOutlined />
                    </a>
                    <a-space class="member-actions">
                      <a-popover trigger="hover" placement="bottom">
                        <template #content>
                          <a-qrcode :value="member.alipayCode || 'not-has-qr'" :status="member.alipayCode ? undefined : 'loading'" :bordered="false" />
                        </template>
                        <a-button type="primary" ghost>
                          <template #icon>
                            <AlipayCircleOutlined />
                          </template>
                          支付宝
                        </a-button>
                      </a-popover>
                      <a-popover trigger="hover" placement="bottom">
                        <template #content>
                          <a-qrcode :value="member.wxCode || 'not-has-qr'" :status="member.wxCode ? undefined : 'loading'" :bordered="false" />
                        </template>
                        <a-button style="color: #07c160; border-color: #07c160">
                          <template #icon>
                            <WechatOutlined />
                          </template>
                          微信
                        </a-button>
                      </a-popover>
                    </a-space>
                  </div>
                </a-card>
              </div>
            </div>
          </div>
        </template>
      </a-tabs>

      <div class="sponsor-footer">
        <p>Antdv Next. 全面保障支付安全及财务合规性。</p>
      </div>
    </div>

    <a-modal
      v-model:open="wechatPayVisible"
      :footer="null"
      :width="420"
      centered
      title="微信支付"
      @cancel="closeWechatPayModal"
    >
      <div class="wechat-pay-sheet">
        <div class="wechat-pay-badge">
          <WechatOutlined />
        </div>
        <h3 class="wechat-pay-title">
          请使用微信扫一扫完成支付
        </h3>
        <p class="wechat-pay-subtitle">
          完成扫码后页面会自动确认支付状态，并在成功后跳转到结果页。
        </p>

        <div class="wechat-pay-qrcode">
          <a-qrcode :value="wechatPayCodeUrl" :size="220" :bordered="false" />
        </div>

        <div class="wechat-pay-meta">
          <div class="wechat-pay-row">
            <span>订单号</span>
            <strong>{{ wechatPayOrderNo }}</strong>
          </div>
          <div class="wechat-pay-row">
            <span>支付金额</span>
            <strong>¥{{ orgSponsorForm.amount }}</strong>
          </div>
        </div>

        <a-alert
          v-if="wechatPayStatus === 'timeout'"
          type="warning"
          show-icon
          :message="wechatPayError"
          class="wechat-pay-alert"
        />
        <a-alert
          v-else-if="wechatPayStatus === 'error'"
          type="error"
          show-icon
          :message="wechatPayError"
          class="wechat-pay-alert"
        />
        <a-alert
          v-else
          type="info"
          show-icon
          message="支付结果确认中，请保持此窗口打开。"
          class="wechat-pay-alert"
        />

        <a-space class="wechat-pay-actions">
          <a-button type="primary" :loading="wechatPayQuerying" @click="refreshWechatPayment">
            我已支付，刷新状态
          </a-button>
          <a-button @click="closeWechatPayModal">
            稍后再说
          </a-button>
        </a-space>
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
.sponsor-page {
  padding: 48px 24px;
  min-height: calc(100vh - var(--ant-doc-header-height));
  background: var(--ant-color-bg-layout);
}

.sponsor-container {
  max-width: 860px;
  margin: 0 auto;
}

.sponsor-header {
  text-align: center;
  margin-bottom: 40px;
}

.sponsor-title {
  font-size: 36px;
  font-weight: 800;
  margin-bottom: 12px;
  color: var(--ant-color-text);
  letter-spacing: -0.5px;
}

.sponsor-desc {
  font-size: 16px;
  color: var(--ant-color-text-secondary);
  margin: 0;
}

.sponsor-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 0;
}

.tab-content {
  padding: 0;
}

.content-card {
  background: var(--ant-color-bg-container);
  border-radius: 24px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  border: 1px solid var(--ant-color-border-secondary);
  padding: 32px;
  margin-top: 24px;
}

.org-sponsor-form {
  max-width: 100%;
}

.amount-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}

.amount-btn {
  padding: 14px 8px;
  border: 2px solid var(--ant-color-border);
  border-radius: 16px;
  background: transparent;
  font-size: 16px;
  font-weight: 700;
  color: var(--ant-color-text);
  cursor: pointer;
  transition: all 0.2s;
}

.amount-btn:hover {
  border-color: var(--ant-color-primary);
  color: var(--ant-color-primary);
}

.amount-btn.active {
  border-color: var(--ant-color-primary);
  background: var(--ant-color-primary-bg);
  color: var(--ant-color-primary);
}

.custom-amount-input {
  width: 100%;
  padding: 10px 8px;
  border: 2px solid var(--ant-color-border);
  border-radius: 16px;
  background: transparent;
  transition: all 0.2s;
}

.custom-amount-input:hover,
.custom-amount-input:focus-within {
  border-color: var(--ant-color-primary);
}

.invoice-section {
  background: var(--ant-color-fill-quaternary);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
}

.invoice-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.invoice-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--ant-color-text);
}

.submit-btn {
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(22, 119, 255, 0.3);
}

.sponsor-amount {
  font-weight: 600;
  color: #52c41a;
}

.team-members {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.member-card {
  text-align: center;
  border-radius: 16px;
  overflow: hidden;
}

.member-card :deep(.ant-card-body) {
  padding: 24px 16px;
}

.member-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.member-name {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: var(--ant-color-text);
}

.member-github {
  color: var(--ant-color-text-secondary);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}

.member-github:hover {
  color: var(--ant-color-primary);
}

.member-actions {
  margin-top: 4px;
}

.qrcode-content {
  text-align: center;
  padding: 8px;
}

.qrcode-img {
  width: 180px;
  height: 180px;
  border-radius: 8px;
}

.qrcode-tip {
  margin-top: 10px;
  color: var(--ant-color-text-secondary);
  margin-bottom: 0;
  font-size: 13px;
}

.sponsor-footer {
  text-align: center;
  margin-top: 40px;
  color: var(--ant-color-text-quaternary);
  font-size: 13px;
}

.sponsor-footer p {
  margin: 0;
}

.wechat-pay-sheet {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding-top: 8px;
}

.wechat-pay-badge {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(7, 193, 96, 0.12);
  color: #07c160;
  font-size: 28px;
}

.wechat-pay-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--ant-color-text);
}

.wechat-pay-subtitle {
  margin: 0;
  text-align: center;
  color: var(--ant-color-text-secondary);
  line-height: 1.6;
}

.wechat-pay-qrcode {
  padding: 18px;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(7, 193, 96, 0.08), rgba(7, 193, 96, 0.02));
}

.wechat-pay-meta {
  width: 100%;
  padding: 16px;
  border-radius: 16px;
  background: var(--ant-color-fill-quaternary);
}

.wechat-pay-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  color: var(--ant-color-text-secondary);
}

.wechat-pay-row + .wechat-pay-row {
  margin-top: 10px;
}

.wechat-pay-row strong {
  color: var(--ant-color-text);
  text-align: right;
  word-break: break-all;
}

.wechat-pay-alert {
  width: 100%;
}

.wechat-pay-actions {
  width: 100%;
  justify-content: center;
}

@media (max-width: 768px) {
  .sponsor-page {
    padding: 20px 12px;
  }

  .sponsor-header {
    margin-bottom: 24px;
  }

  .sponsor-title {
    font-size: 24px;
    letter-spacing: 0;
  }

  .sponsor-desc {
    font-size: 14px;
  }

  .content-card {
    padding: 16px;
    border-radius: 16px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  }

  .amount-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .amount-btn {
    padding: 10px 4px;
    font-size: 14px;
    border-radius: 12px;
  }

  .invoice-section {
    padding: 14px;
    border-radius: 12px;
  }

  .submit-btn {
    height: 44px;
    font-size: 15px;
    border-radius: 12px;
  }

  .team-members {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .member-card {
    border-radius: 12px;
  }

  .member-card :deep(.ant-card-body) {
    padding: 16px 10px;
  }

  .member-content {
    gap: 8px;
  }

  .member-content :deep(.ant-avatar) {
    width: 56px !important;
    height: 56px !important;
    font-size: 24px !important;
  }

  .member-name {
    font-size: 14px;
  }

  .member-actions {
    margin-top: 2px;
  }

  .member-actions :deep(.ant-btn) {
    padding: 0 8px;
    font-size: 12px;
    height: 28px;
  }

  .qrcode-img {
    width: 150px;
    height: 150px;
  }

  .sponsors-list {
    gap: 14px;
  }

  .sponsor-footer {
    margin-top: 28px;
  }

  .wechat-pay-qrcode {
    padding: 14px;
  }
}

@media (max-width: 375px) {
  .sponsor-page {
    padding: 16px 10px;
  }

  .sponsor-title {
    font-size: 20px;
  }

  .content-card {
    padding: 12px;
  }

  .amount-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }

  .amount-btn {
    padding: 8px 2px;
    font-size: 13px;
  }

  .team-members {
    grid-template-columns: 1fr;
  }

  .member-content :deep(.ant-avatar) {
    width: 48px !important;
    height: 48px !important;
  }
}
</style>
