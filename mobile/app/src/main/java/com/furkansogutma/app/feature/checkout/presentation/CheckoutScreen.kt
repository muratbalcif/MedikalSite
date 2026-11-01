package com.furkansogutma.app.feature.checkout.presentation

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.furkansogutma.app.core.common.result.Result
import com.furkansogutma.app.core.designsystem.components.FurkanButton
import com.furkansogutma.app.core.designsystem.components.FurkanCheckoutStepper
import com.furkansogutma.app.core.designsystem.components.FurkanLoading
import com.furkansogutma.app.core.designsystem.components.FurkanOutlinedButton
import com.furkansogutma.app.core.designsystem.components.FurkanStickyBottomBar
import com.furkansogutma.app.core.designsystem.components.FurkanTextField
import com.furkansogutma.app.core.designsystem.components.FurkanTopBar
import com.furkansogutma.app.core.designsystem.theme.FurkanSpacing
import com.furkansogutma.app.core.designsystem.theme.Primary
import com.furkansogutma.app.feature.account.domain.repository.AccountRepository
import com.furkansogutma.app.feature.account.domain.model.Address
import com.furkansogutma.app.feature.account.domain.model.AddressInput
import com.furkansogutma.app.feature.account.domain.model.CompanyBankAccount
import com.furkansogutma.app.feature.cart.domain.usecase.GetCartUseCase
import com.furkansogutma.app.feature.order.domain.model.CreateOrderInput
import com.furkansogutma.app.feature.checkout.domain.usecase.CreateOrderUseCase
import com.furkansogutma.app.feature.order.domain.model.Order
import com.furkansogutma.app.feature.checkout.domain.usecase.ValidateCheckoutUseCase
import com.furkansogutma.app.feature.checkout.domain.usecase.ValidateCouponUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class CheckoutUiModel(
    val addresses: List<Address> = emptyList(),
    val total: String? = null,
    val bankAccounts: List<CompanyBankAccount> = emptyList(),
    val couponCode: String = "",
    val couponMessage: String? = null,
    val couponDiscount: String? = null,
    val couponValid: Boolean? = null,
    val couponValidating: Boolean = false,
    val loading: Boolean = true,
    val submitting: Boolean = false,
    val error: String? = null,
)

sealed interface CheckoutEffect {
    data class OrderCreated(val orderId: String, val paymentMethod: String) : CheckoutEffect
    data class Message(val text: String) : CheckoutEffect
}

@HiltViewModel
class CheckoutViewModel @Inject constructor(
    private val accountRepository: AccountRepository,
    private val getCart: GetCartUseCase,
    private val validateCheckout: ValidateCheckoutUseCase,
    private val validateCoupon: ValidateCouponUseCase,
    private val createOrder: CreateOrderUseCase,
) : ViewModel() {
    private val _ui = MutableStateFlow(CheckoutUiModel())
    val ui = _ui.asStateFlow()
    private val _effects = MutableSharedFlow<CheckoutEffect>()
    val effects = _effects.asSharedFlow()

    init {
        viewModelScope.launch {
            val addresses = accountRepository.getAddresses()
            val cart = getCart()
            val banks = accountRepository.getBankAccounts()
            _ui.value = CheckoutUiModel(
                addresses = (addresses as? Result.Success)?.data.orEmpty(),
                total = (cart as? Result.Success)?.let { "${it.data.total} ${it.data.currency}" },
                bankAccounts = (banks as? Result.Success)?.data.orEmpty(),
                loading = false,
                error = listOf(addresses, cart)
                    .filterIsInstance<Result.Error>()
                    .firstOrNull()?.error?.message,
            )
        }
    }

    fun createAddress(input: AddressInput, onDone: () -> Unit) {
        viewModelScope.launch {
            when (val result = accountRepository.createAddress(input)) {
                is Result.Success -> {
                    val list = accountRepository.getAddresses()
                    if (list is Result.Success) {
                        _ui.value = _ui.value.copy(addresses = list.data)
                    }
                    onDone()
                }
                is Result.Error -> _effects.emit(CheckoutEffect.Message(result.error.message))
            }
        }
    }

    fun updateCouponCode(code: String) {
        _ui.value = _ui.value.copy(
            couponCode = code,
            couponMessage = null,
            couponDiscount = null,
            couponValid = null,
        )
    }

    fun applyCoupon() {
        val code = _ui.value.couponCode.trim()
        if (code.isEmpty()) {
            viewModelScope.launch {
                _effects.emit(CheckoutEffect.Message("Kupon kodu girin"))
            }
            return
        }
        if (_ui.value.couponValidating) return
        viewModelScope.launch {
            _ui.value = _ui.value.copy(couponValidating = true, couponMessage = null)
            when (val result = validateCoupon(code)) {
                is Result.Error -> {
                    _ui.value = _ui.value.copy(
                        couponValidating = false,
                        couponValid = false,
                        couponDiscount = null,
                        couponMessage = result.error.message,
                    )
                }
                is Result.Success -> {
                    if (!result.data.valid) {
                        _ui.value = _ui.value.copy(
                            couponValidating = false,
                            couponValid = false,
                            couponDiscount = null,
                            couponMessage = result.data.message ?: "Kupon geçersiz",
                        )
                    } else {
                        _ui.value = _ui.value.copy(
                            couponValidating = false,
                            couponValid = true,
                            couponDiscount = result.data.discountAmount,
                            couponMessage = result.data.message ?: "Kupon uygulandı",
                        )
                    }
                }
            }
        }
    }

    fun placeOrder(addressId: String) {
        if (_ui.value.submitting) return
        viewModelScope.launch {
            _ui.value = _ui.value.copy(submitting = true, error = null)
            val coupon = _ui.value.couponCode.trim().ifBlank { null }
            if (coupon != null) {
                when (val couponResult = validateCoupon(coupon)) {
                    is Result.Error -> {
                        _ui.value = _ui.value.copy(
                            submitting = false,
                            couponValid = false,
                            couponMessage = couponResult.error.message,
                            error = couponResult.error.message,
                        )
                        _effects.emit(CheckoutEffect.Message(couponResult.error.message))
                        return@launch
                    }
                    is Result.Success -> {
                        if (!couponResult.data.valid) {
                            val msg = couponResult.data.message ?: "Kupon geçersiz"
                            _ui.value = _ui.value.copy(
                                submitting = false,
                                couponValid = false,
                                couponDiscount = null,
                                couponMessage = msg,
                                error = msg,
                            )
                            _effects.emit(CheckoutEffect.Message(msg))
                            return@launch
                        }
                        _ui.value = _ui.value.copy(
                            couponValid = true,
                            couponDiscount = couponResult.data.discountAmount,
                            couponMessage = couponResult.data.message ?: "Kupon uygulandı",
                        )
                    }
                }
            }
            val input = CreateOrderInput(
                shippingAddressId = addressId,
                billingAddressId = addressId,
                paymentMethod = "BANK_TRANSFER",
                couponCode = coupon,
            )
            when (val validation = validateCheckout(input)) {
                is Result.Error -> {
                    _ui.value = _ui.value.copy(submitting = false, error = validation.error.message)
                    _effects.emit(CheckoutEffect.Message(validation.error.message))
                    return@launch
                }
                is Result.Success -> {
                    if (!validation.data.valid) {
                        val detail = validation.data.issues
                            .joinToString("\n") { it.message }
                            .ifBlank { "Checkout doğrulaması başarısız" }
                        _ui.value = _ui.value.copy(submitting = false, error = detail)
                        _effects.emit(CheckoutEffect.Message(detail))
                        return@launch
                    }
                    validation.data.total?.let { total ->
                        val currency = validation.data.currency.orEmpty()
                        _ui.value = _ui.value.copy(
                            total = listOf(total, currency).filter { it.isNotBlank() }.joinToString(" "),
                        )
                    }
                }
            }
            when (val result = createOrder(input)) {
                is Result.Success -> {
                    _ui.value = _ui.value.copy(submitting = false)
                    _effects.emit(CheckoutEffect.OrderCreated(result.data.id, "BANK_TRANSFER"))
                }
                is Result.Error -> {
                    _ui.value = _ui.value.copy(submitting = false, error = result.error.message)
                    _effects.emit(CheckoutEffect.Message(result.error.message))
                }
            }
        }
    }
}
@Composable
fun CheckoutRoute(
    onOrderCreated: (orderId: String, paymentMethod: String) -> Unit,
    onBack: () -> Unit = {},
    onManageAddresses: () -> Unit = {},
    viewModel: CheckoutViewModel = hiltViewModel(),
) {
    val ui by viewModel.ui.collectAsStateWithLifecycle()
    var step by remember { mutableIntStateOf(1) }
    var selectedAddress by remember { mutableStateOf<String?>(null) }
    var showNewAddress by remember { mutableStateOf(false) }
    val snackbar = remember { SnackbarHostState() }
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        viewModel.effects.collect { effect ->
            when (effect) {
                is CheckoutEffect.OrderCreated -> onOrderCreated(effect.orderId, effect.paymentMethod)
                is CheckoutEffect.Message -> snackbar.showSnackbar(effect.text)
            }
        }
    }

    if (ui.loading) {
        FurkanLoading()
        return
    }

    Scaffold(
        topBar = { FurkanTopBar(title = "Ödeme", onBack = onBack) },
        snackbarHost = { SnackbarHost(snackbar) },
        bottomBar = {
            FurkanStickyBottomBar {
                when (step) {
                    1 -> FurkanButton(
                        text = "Devam",
                        modifier = Modifier.fillMaxWidth(),
                        enabled = selectedAddress != null,
                    ) { step = 2 }
                    2 -> FurkanButton("Onaya geç", Modifier.fillMaxWidth()) { step = 3 }
                    else -> FurkanButton(
                        text = "Siparişi Oluştur",
                        modifier = Modifier.fillMaxWidth(),
                        loading = ui.submitting,
                    ) {
                        selectedAddress?.let { viewModel.placeOrder(it) }
                    }
                }
            }
        },
    ) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(FurkanSpacing.md)
                .verticalScroll(rememberScrollState()),
        ) {
            FurkanCheckoutStepper(currentStep = step)
            Spacer(Modifier.height(FurkanSpacing.md))
            when (step) {
                1 -> {
                    Text("Teslimat adresi", style = MaterialTheme.typography.titleLarge)
                    Spacer(Modifier.height(FurkanSpacing.sm))
                    ui.addresses.forEach { address ->
                        RowClickableAddress(
                            address = address,
                            selected = selectedAddress == address.id,
                            onClick = { selectedAddress = address.id },
                        )
                    }
                    Spacer(Modifier.height(FurkanSpacing.sm))
                    FurkanOutlinedButton("+ Yeni Adres", Modifier.fillMaxWidth()) {
                        showNewAddress = !showNewAddress
                    }
                    if (showNewAddress) {
                        AddressCreateForm { input ->
                            viewModel.createAddress(input) {
                                showNewAddress = false
                            }
                        }
                    }
                    FurkanOutlinedButton("Adreslerimi yönet", Modifier.fillMaxWidth(), onClick = onManageAddresses)
                }
                2 -> {
                    Text("Ödeme yöntemi", style = MaterialTheme.typography.titleLarge)
                    PaymentOption("Havale / EFT", selected = true) {}
                    Text(
                        "İlk sürümde tek ödeme yöntemi havale/EFT'dir.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(Modifier.height(FurkanSpacing.md))
                    Text("Banka bilgileri", style = MaterialTheme.typography.titleMedium)
                    if (ui.bankAccounts.isEmpty()) {
                        Text("Aktif banka hesabı bulunamadı.")
                    } else {
                        ui.bankAccounts.forEach { bank ->
                            Spacer(Modifier.height(FurkanSpacing.sm))
                            Text(bank.bankName, style = MaterialTheme.typography.titleSmall)
                            Text(bank.accountName)
                            Text(bank.iban)
                            FurkanOutlinedButton("IBAN Kopyala", Modifier.fillMaxWidth()) {
                                val clipboard =
                                    context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                clipboard.setPrimaryClip(ClipData.newPlainText("IBAN", bank.iban))
                            }
                        }
                    }
                }
                else -> {
                    Text("Sipariş onayı", style = MaterialTheme.typography.titleLarge)
                    Text("Adres: ${ui.addresses.firstOrNull { it.id == selectedAddress }?.fullName.orEmpty()}")
                    Text("Ödeme: Havale / EFT")
                    Spacer(Modifier.height(FurkanSpacing.sm))
                    FurkanTextField(
                        value = ui.couponCode,
                        onValueChange = viewModel::updateCouponCode,
                        label = "Kupon kodunuz",
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(FurkanSpacing.sm))
                    FurkanOutlinedButton(
                        if (ui.couponValidating) "Doğrulanıyor…" else "Kuponu doğrula",
                        Modifier.fillMaxWidth(),
                    ) {
                        viewModel.applyCoupon()
                    }
                    ui.couponMessage?.let {
                        Text(
                            it,
                            color = if (ui.couponValid == true) {
                                MaterialTheme.colorScheme.primary
                            } else {
                                MaterialTheme.colorScheme.error
                            },
                        )
                    }
                    ui.couponDiscount?.let {
                        Text("Kupon indirimi (sunucu): $it TRY")
                    }
                    Text("Toplam: ${ui.total.orEmpty()}", style = MaterialTheme.typography.titleMedium)
                    ui.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                }
            }
        }
    }
}

@Composable
private fun RowClickableAddress(address: Address, selected: Boolean, onClick: () -> Unit) {
    Column(
        Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = FurkanSpacing.sm),
    ) {
        androidx.compose.foundation.layout.Row {
            RadioButton(selected = selected, onClick = onClick)
            Column {
                Text(address.title, style = MaterialTheme.typography.titleMedium)
                Text("${address.fullName} · ${address.phone}")
                Text("${address.addressLine}, ${address.district}/${address.city}")
                if (address.isDefault) Text("Varsayılan", color = MaterialTheme.colorScheme.primary)
            }
        }
    }
}

@Composable
private fun PaymentOption(label: String, selected: Boolean, onClick: () -> Unit) {
    androidx.compose.foundation.layout.Row(
        Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = FurkanSpacing.xs),
    ) {
        RadioButton(selected = selected, onClick = onClick)
        Text(label, modifier = Modifier.padding(top = FurkanSpacing.sm))
    }
}

@Composable
private fun AddressCreateForm(onSubmit: (AddressInput) -> Unit) {
    var title by remember { mutableStateOf("Ev") }
    var firstName by remember { mutableStateOf("") }
    var lastName by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var city by remember { mutableStateOf("") }
    var district by remember { mutableStateOf("") }
    var addressLine by remember { mutableStateOf("") }
    var postalCode by remember { mutableStateOf("") }
    Column {
        FurkanTextField(title, { title = it }, "Adres başlığı")
        FurkanTextField(firstName, { firstName = it }, "Ad")
        FurkanTextField(lastName, { lastName = it }, "Soyad")
        FurkanTextField(phone, { phone = it }, "Telefon", keyboardType = KeyboardType.Phone)
        FurkanTextField(city, { city = it }, "İl")
        FurkanTextField(district, { district = it }, "İlçe")
        FurkanTextField(addressLine, { addressLine = it }, "Adres")
        FurkanTextField(postalCode, { postalCode = it }, "Posta kodu", keyboardType = KeyboardType.Number)
        FurkanButton("Adresi kaydet", Modifier.fillMaxWidth()) {
            onSubmit(
                AddressInput(
                    title = title,
                    firstName = firstName,
                    lastName = lastName,
                    phone = phone,
                    city = city,
                    district = district,
                    addressLine = addressLine,
                    postalCode = postalCode.ifBlank { null },
                    isDefault = false,
                ),
            )
        }
    }
}

@Composable
fun OrderSuccessRoute(
    orderId: String,
    paymentMethod: String,
    onViewOrder: (String) -> Unit,
    onContinueShopping: () -> Unit,
    onBankTransfer: (String) -> Unit,
    vm: OrderSuccessViewModel = hiltViewModel(),
) {
    var order by remember { mutableStateOf<Order?>(null) }
    var banks by remember { mutableStateOf<List<CompanyBankAccount>>(emptyList()) }
    var loading by remember { mutableStateOf(paymentMethod == "BANK_TRANSFER") }
    var error by remember { mutableStateOf<String?>(null) }
    var message by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val brandBlue = Primary

    fun load() {
        if (paymentMethod != "BANK_TRANSFER") {
            loading = false
            return
        }
        scope.launch {
            loading = true
            error = null
            when (val banksResult = vm.getBankAccounts()) {
                is Result.Success -> banks = banksResult.data
                is Result.Error -> error = banksResult.error.message
            }
            when (val orderResult = vm.loadOrder(orderId)) {
                is Result.Success -> order = orderResult.data
                is Result.Error -> if (error == null) error = orderResult.error.message
            }
            loading = false
        }
    }

    LaunchedEffect(orderId, paymentMethod) { load() }

    fun copy(label: String, value: String) {
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        clipboard.setPrimaryClip(ClipData.newPlainText(label, value))
        message = "$label kopyalandı"
    }

    val selectedBank = banks.firstOrNull()
    val remaining = order?.paymentRemainingAmount ?: order?.total
    val reference = order?.paymentReference
    val paymentStatusLabel = com.furkansogutma.app.core.common.labels.EnumLabels.paymentStatus(
        order?.paymentStatus,
    )

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(FurkanSpacing.xl),
    ) {
        Text("Siparişiniz oluşturuldu.", style = MaterialTheme.typography.headlineLarge)
        Spacer(Modifier.height(FurkanSpacing.sm))
        Text("Sipariş No: ${order?.orderNumber ?: orderId}")
        if (paymentMethod == "BANK_TRANSFER") {
            Text("Ödeme yöntemi: Havale / EFT")
            if (loading) {
                Spacer(Modifier.height(FurkanSpacing.md))
                FurkanLoading()
            } else {
                Text("Ödeme durumu: $paymentStatusLabel")
                remaining?.let {
                    Text("Kalan tutar: ${formatTryAmount(it)}")
                }
                reference?.let {
                    Spacer(Modifier.height(FurkanSpacing.sm))
                    Text("Ödeme referansı", style = MaterialTheme.typography.titleMedium)
                    Text(it, fontWeight = FontWeight.Medium)
                    FurkanOutlinedButton(
                        "Referansı Kopyala",
                        Modifier.fillMaxWidth(),
                        enabled = !loading,
                    ) { copy("Referans", it) }
                }
                selectedBank?.let { bank ->
                    Spacer(Modifier.height(FurkanSpacing.md))
                    Text("Banka hesabı", style = MaterialTheme.typography.titleMedium)
                    Text(bank.bankName, fontWeight = FontWeight.SemiBold, color = brandBlue)
                    Text(bank.accountName)
                    Text(bank.iban, fontWeight = FontWeight.Medium)
                    FurkanOutlinedButton(
                        "IBAN'ı Kopyala",
                        Modifier.fillMaxWidth(),
                        enabled = !loading,
                    ) { copy("IBAN", bank.iban) }
                }
                if (error != null && selectedBank == null) {
                    Text(error!!, color = MaterialTheme.colorScheme.error)
                    FurkanOutlinedButton("Tekrar dene", Modifier.fillMaxWidth()) { load() }
                }
                if (banks.isEmpty() && error == null && !loading) {
                    Text(
                        "Aktif banka hesabı bulunamadı. Sipariş detayından daha sonra deneyebilirsiniz.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
        message?.let {
            Spacer(Modifier.height(FurkanSpacing.sm))
            Text(it, color = brandBlue)
        }
        Spacer(Modifier.height(FurkanSpacing.lg))
        FurkanButton("Siparişi Görüntüle", Modifier.fillMaxWidth(), enabled = !loading) {
            onViewOrder(orderId)
        }
        Spacer(Modifier.height(FurkanSpacing.sm))
        FurkanOutlinedButton(
            "Alışverişe Devam Et",
            Modifier.fillMaxWidth(),
            enabled = !loading,
            onClick = onContinueShopping,
        )
        if (paymentMethod == "BANK_TRANSFER") {
            Spacer(Modifier.height(FurkanSpacing.sm))
            FurkanButton(
                text = if (loading) "Yükleniyor…" else "Havale / EFT ile Öde",
                modifier = Modifier.fillMaxWidth(),
                enabled = !loading,
                loading = loading,
            ) { onBankTransfer(orderId) }
            Text(
                "Havale yaptıktan sonra “Ödemeyi Yaptım” ile bildiriminizi gönderin.",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall,
            )
        }
    }
}

private fun formatTryAmount(amount: String?): String {
    if (amount.isNullOrBlank()) return "—"
    val value = amount.toBigDecimalOrNull() ?: return "$amount ₺"
    val formatter = java.text.NumberFormat.getCurrencyInstance(java.util.Locale("tr", "TR"))
    formatter.currency = java.util.Currency.getInstance("TRY")
    formatter.minimumFractionDigits = 2
    formatter.maximumFractionDigits = 2
    return formatter.format(value)
}
