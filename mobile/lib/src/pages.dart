import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import 'models.dart';
import 'shop.dart';
import 'theme.dart';
import 'widgets.dart';

class HomePage extends StatelessWidget {
  const HomePage({
    required this.openShop,
    required this.openProduct,
    required this.openTryOn,
    super.key,
  });

  final void Function(String mode) openShop;
  final void Function(Product product) openProduct;
  final VoidCallback openTryOn;

  @override
  Widget build(BuildContext context) {
    final shop = ShopScope.of(context);
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
      children: [
        Text('AUTUMN / WINTER 2026', style: eyebrow()),
        const SizedBox(height: 8),
        Text('Discover your style.', style: display(42)),
        Text(
          'Try before you buy.',
          style: display(42).copyWith(
            fontStyle: FontStyle.italic,
            color: AurelleColors.goldDeep,
          ),
        ),
        const SizedBox(height: 12),
        const Text(
          'The AURELLE house, in your pocket. Same cloth, same prices, same bag.',
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: GoldButton(
                label: 'Explore',
                onPressed: () => openShop('new'),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton(
                onPressed: openTryOn,
                child: const Text('TRY ON'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),
        if (shop.hero['woman'] != null)
          AspectRatio(
            aspectRatio: 4 / 5,
            child: ClothImage(url: shop.hero['woman']!),
          ),
        const SizedBox(height: 28),
        _Rail(
          title: 'Men',
          products: shop.where(gender: 'men').take(6).toList(),
          onOpen: openProduct,
          onMore: () => openShop('men'),
        ),
        _Rail(
          title: 'Women',
          products: shop.where(gender: 'women').take(6).toList(),
          onOpen: openProduct,
          onMore: () => openShop('women'),
        ),
        _Rail(
          title: 'Trending',
          products: shop.where(trending: true).take(6).toList(),
          onOpen: openProduct,
          onMore: () => openShop('trending'),
        ),
        const SizedBox(height: 12),
        Text('NOTES', style: eyebrow()),
        const SizedBox(height: 8),
        for (final note in shop.testimonials)
          Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Text(
              '“${note['quote']}”\n— ${note['name']}',
              style: display(18),
            ),
          ),
      ],
    );
  }
}

class _Rail extends StatelessWidget {
  const _Rail({
    required this.title,
    required this.products,
    required this.onOpen,
    required this.onMore,
  });

  final String title;
  final List<Product> products;
  final void Function(Product product) onOpen;
  final VoidCallback onMore;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Text(title, style: display(28)),
            const Spacer(),
            TextButton(onPressed: onMore, child: const Text('VIEW ALL')),
          ],
        ),
        SizedBox(
          height: 280,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: products.length,
            separatorBuilder: (_, _) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final product = products[index];
              return SizedBox(
                width: 170,
                child: ProductCard(
                  product: product,
                  onOpen: () => onOpen(product),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 12),
      ],
    );
  }
}

class ShopPage extends StatelessWidget {
  const ShopPage({
    required this.mode,
    required this.onOpen,
    required this.onMode,
    super.key,
  });

  final String mode;
  final void Function(Product product) onOpen;
  final ValueChanged<String> onMode;

  @override
  Widget build(BuildContext context) {
    final shop = ShopScope.of(context);
    final products = switch (mode) {
      'men' => shop.where(gender: 'men'),
      'women' => shop.where(gender: 'women'),
      'new' => shop.where(newest: true),
      'trending' => shop.where(trending: true),
      _ => shop.products,
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
          child: Text(_title(mode), style: display(34)),
        ),
        SizedBox(
          height: 52,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            children: [
              for (final item in const [
                'all',
                'men',
                'women',
                'new',
                'trending',
              ])
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(item.toUpperCase()),
                    selected: item == mode,
                    onSelected: (_) => onMode(item),
                  ),
                ),
            ],
          ),
        ),
        Expanded(
          child: GridView.builder(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 0.58,
              crossAxisSpacing: 12,
              mainAxisSpacing: 16,
            ),
            itemCount: products.length,
            itemBuilder: (context, index) => ProductCard(
              product: products[index],
              onOpen: () => onOpen(products[index]),
            ),
          ),
        ),
      ],
    );
  }

  String _title(String mode) {
    return switch (mode) {
      'men' => 'Men',
      'women' => 'Women',
      'new' => 'New arrivals',
      'trending' => 'Trending',
      _ => 'The edit',
    };
  }
}

class ProductPage extends StatefulWidget {
  const ProductPage({required this.product, super.key});

  final Product product;

  @override
  State<ProductPage> createState() => _ProductPageState();
}

class _ProductPageState extends State<ProductPage> {
  late String size =
      widget.product.sizes[widget.product.sizes.length > 2 ? 2 : 0];
  late String color = widget.product.colors.first.name;

  @override
  Widget build(BuildContext context) {
    final product = widget.product;
    final shop = ShopScope.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('AURELLE')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        children: [
          AspectRatio(
            aspectRatio: 3 / 4,
            child: ClothImage(url: product.images.first),
          ),
          const SizedBox(height: 16),
          Text(product.category.toUpperCase(), style: eyebrow()),
          Text(product.name, style: display(36)),
          Text(
            '${money(product.price)}  ·  ${product.rating} (${product.reviews})',
          ),
          const SizedBox(height: 12),
          Text(product.description),
          const SizedBox(height: 8),
          Text(
            product.fabric,
            style: const TextStyle(color: AurelleColors.goldDeep),
          ),
          const SizedBox(height: 16),
          Text('COLOR', style: eyebrow()),
          Wrap(
            spacing: 8,
            children: [
              for (final swatch in product.colors)
                ChoiceChip(
                  label: Text(swatch.name),
                  selected: color == swatch.name,
                  onSelected: (_) => setState(() => color = swatch.name),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text('SIZE', style: eyebrow()),
          Wrap(
            spacing: 8,
            children: [
              for (final item in product.sizes)
                ChoiceChip(
                  label: Text(item),
                  selected: size == item,
                  onSelected: (_) => setState(() => size = item),
                ),
            ],
          ),
          const SizedBox(height: 20),
          GoldButton(
            label: product.soldOut ? 'Sold out' : 'Add to bag',
            onPressed: product.soldOut
                ? null
                : () {
                    shop.addToCart(product, size: size, color: color);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('${product.name} added to your bag.'),
                      ),
                    );
                  },
          ),
        ],
      ),
    );
  }
}

class BagPage extends StatelessWidget {
  const BagPage({required this.onCheckout, super.key});

  final VoidCallback onCheckout;

  @override
  Widget build(BuildContext context) {
    final shop = ShopScope.of(context);
    if (shop.cart.isEmpty) {
      return Center(child: Text('Your bag is empty.', style: display(28)));
    }
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text('Your bag', style: display(34)),
        for (final line in shop.cart)
          _Line(line: line, product: shop.find(line.productId)),
        const Divider(),
        Text('Subtotal ${money(shop.subtotal)}'),
        if (shop.coupon != null)
          Text('Code ${shop.coupon}  −${money(shop.discount)}'),
        const SizedBox(height: 12),
        GoldButton(label: 'Checkout', onPressed: onCheckout),
      ],
    );
  }
}

class _Line extends StatelessWidget {
  const _Line({required this.line, required this.product});

  final CartLine line;
  final Product? product;

  @override
  Widget build(BuildContext context) {
    final shop = ShopScope.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          SizedBox(
            width: 72,
            height: 96,
            child: product == null
                ? const SizedBox.shrink()
                : ClothImage(url: product!.images.first),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(product?.name ?? 'Piece', style: display(20)),
                Text('${line.color} · ${line.size}'),
                Text(money((product?.price ?? 0) * line.qty)),
              ],
            ),
          ),
          IconButton(
            onPressed: () => shop.setQty(line, line.qty - 1),
            icon: const Icon(Icons.remove),
          ),
          Text('${line.qty}'),
          IconButton(
            onPressed: () => shop.setQty(line, line.qty + 1),
            icon: const Icon(Icons.add),
          ),
        ],
      ),
    );
  }
}

class CheckoutPage extends StatefulWidget {
  const CheckoutPage({super.key});

  @override
  State<CheckoutPage> createState() => _CheckoutPageState();
}

class _CheckoutPageState extends State<CheckoutPage> {
  final _code = TextEditingController();
  String method = 'standard';
  String? message;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final shop = ShopScope.of(context);
    final goods = shop.subtotal - shop.discount;
    final shipping = shippingFor(goods, method);
    return Scaffold(
      appBar: AppBar(title: const Text('CHECKOUT')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text('Shipping', style: display(28)),
          RadioListTile(
            value: 'standard',
            groupValue: method,
            title: Text(
              goods >= 150 ? 'Standard · complimentary' : 'Standard · \$12',
            ),
            onChanged: (value) => setState(() => method = value!),
          ),
          RadioListTile(
            value: 'express',
            groupValue: method,
            title: const Text('Express · \$28'),
            onChanged: (value) => setState(() => method = value!),
          ),
          RadioListTile(
            value: 'atelier',
            groupValue: method,
            title: const Text('Atelier appointment · \$45'),
            onChanged: (value) => setState(() => method = value!),
          ),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _code,
                  decoration: const InputDecoration(labelText: 'Code'),
                  textCapitalization: TextCapitalization.characters,
                ),
              ),
              const SizedBox(width: 8),
              TextButton(
                onPressed: () =>
                    setState(() => message = shop.applyCoupon(_code.text)),
                child: const Text('APPLY'),
              ),
            ],
          ),
          if (message != null)
            Text(
              message!,
              style: const TextStyle(color: AurelleColors.goldDeep),
            ),
          const SizedBox(height: 16),
          Text('Goods ${money(goods)}'),
          Text('Shipping ${shipping == 0 ? 'complimentary' : money(shipping)}'),
          Text('Total ${money(goods + shipping)}', style: display(28)),
          const SizedBox(height: 16),
          GoldButton(
            label: 'Place order',
            onPressed: shop.cart.isEmpty
                ? null
                : () {
                    final order = shop.placeOrder(method);
                    Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(
                        builder: (_) => OrderPage(order: order),
                      ),
                    );
                  },
          ),
        ],
      ),
    );
  }
}

class OrderPage extends StatelessWidget {
  const OrderPage({required this.order, super.key});

  final HouseOrder order;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('AURELLE')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Order placed.', style: display(36)),
            const SizedBox(height: 8),
            Text(order.id),
            Text(money(order.total)),
            const SizedBox(height: 12),
            for (final item in order.items) Text(item),
          ],
        ),
      ),
    );
  }
}

class AccountPage extends StatelessWidget {
  const AccountPage({super.key});

  @override
  Widget build(BuildContext context) {
    final shop = ShopScope.of(context);
    final saved = shop.products
        .where((product) => shop.saved(product.id))
        .toList();
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text('Amelia Voss', style: display(34)),
        const Text('Atelier Gold · amelia@ateliermail.com'),
        const SizedBox(height: 20),
        Text('Saved', style: display(24)),
        if (saved.isEmpty) const Text('Nothing saved yet.'),
        for (final product in saved)
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: SizedBox(
              width: 48,
              height: 64,
              child: ClothImage(url: product.images.first),
            ),
            title: Text(product.name),
            subtitle: Text(money(product.price)),
            trailing: IconButton(
              onPressed: () => shop.toggleSaved(product.id),
              icon: const Icon(Icons.favorite),
            ),
          ),
        const SizedBox(height: 12),
        Text('Orders', style: display(24)),
        if (shop.orders.isEmpty) const Text('No orders on this phone yet.'),
        for (final order in shop.orders)
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(order.id),
            subtitle: Text(order.items.join('\n')),
            trailing: Text(money(order.total)),
          ),
      ],
    );
  }
}

class SearchPage extends StatefulWidget {
  const SearchPage({required this.onOpen, super.key});

  final void Function(Product product) onOpen;

  @override
  State<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends State<SearchPage> {
  String query = '';

  @override
  Widget build(BuildContext context) {
    final results = ShopScope.of(context).where(query: query);
    return Scaffold(
      appBar: AppBar(title: const Text('SEARCH')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              autofocus: true,
              decoration: const InputDecoration(hintText: 'Search clothing'),
              onChanged: (value) => setState(() => query = value),
            ),
          ),
          Expanded(
            child: ListView(
              children: [
                for (final product
                    in (query.trim().isEmpty ? <Product>[] : results))
                  ListTile(
                    leading: SizedBox(
                      width: 48,
                      height: 64,
                      child: ClothImage(url: product.images.first),
                    ),
                    title: Text(product.name),
                    subtitle: Text(
                      '${product.category} · ${money(product.price)}',
                    ),
                    onTap: () => widget.onOpen(product),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class TryOnPage extends StatefulWidget {
  const TryOnPage({super.key});

  @override
  State<TryOnPage> createState() => _TryOnPageState();
}

class _TryOnPageState extends State<TryOnPage> {
  final _picker = ImagePicker();
  Uint8List? photo;
  String? productId;
  Offset offset = const Offset(0, 40);
  double scale = 0.72;

  Future<void> _pick(ImageSource source) async {
    try {
      final file = await _picker.pickImage(source: source, maxWidth: 1600);
      if (file != null) {
        final bytes = await file.readAsBytes();
        if (!mounted) return;
        setState(() => photo = bytes);
      }
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('The camera could not open. $error')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final shop = ShopScope.of(context);
    final wearable = shop.products
        .where(
          (product) =>
              !product.category.toLowerCase().contains('shoe') &&
              !product.category.toLowerCase().contains('accessor'),
        )
        .toList();
    final selected = shop.find(productId ?? '') ?? wearable.firstOrNull;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      children: [
        Text('Live trial', style: display(34)),
        const SizedBox(height: 6),
        const Text(
          'Place a garment on your photograph. This phone preview does not track your body the way the browser trial room does.',
        ),
        const SizedBox(height: 12),
        AspectRatio(
          aspectRatio: 3 / 4,
          child: ColoredBox(
            color: AurelleColors.ink,
            child: photo == null
                ? const Center(
                    child: Text(
                      'No photograph yet',
                      style: TextStyle(color: AurelleColors.ivory),
                    ),
                  )
                : GestureDetector(
                    onPanUpdate: (details) =>
                        setState(() => offset += details.delta),
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        Image.memory(photo!, fit: BoxFit.cover),
                        if (selected != null)
                          Align(
                            alignment: Alignment.center,
                            child: Transform.translate(
                              offset: offset,
                              child: FractionallySizedBox(
                                widthFactor: scale,
                                child: Opacity(
                                  opacity: 0.92,
                                  child: Image.network(
                                    selected.images.first,
                                    fit: BoxFit.contain,
                                  ),
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () => _pick(ImageSource.camera),
                child: const Text('CAMERA'),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton(
                onPressed: () => _pick(ImageSource.gallery),
                child: const Text('PHOTO'),
              ),
            ),
          ],
        ),
        Slider(
          value: scale,
          min: 0.35,
          max: 1,
          onChanged: (value) => setState(() => scale = value),
        ),
        SizedBox(
          height: 92,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: wearable.length,
            separatorBuilder: (_, _) => const SizedBox(width: 8),
            itemBuilder: (context, index) {
              final product = wearable[index];
              final on = product.id == selected?.id;
              return GestureDetector(
                onTap: () => setState(() => productId = product.id),
                child: Container(
                  width: 72,
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: on ? AurelleColors.goldDeep : Colors.transparent,
                      width: 2,
                    ),
                  ),
                  child: ClothImage(url: product.images.first),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 12),
        if (selected != null)
          GoldButton(
            label: 'Add ${selected.name}',
            onPressed: selected.soldOut
                ? null
                : () {
                    shop.addToCart(
                      selected,
                      size: selected.sizes[selected.sizes.length > 2 ? 2 : 0],
                      color: selected.colors.first.name,
                    );
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('${selected.name} added to your bag.'),
                      ),
                    );
                  },
          ),
      ],
    );
  }
}
