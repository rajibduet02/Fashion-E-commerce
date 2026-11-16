import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'models.dart';

class Shop extends ChangeNotifier {
  List<Product> products = [];
  Map<String, String> hero = {};
  List<Map<String, String>> testimonials = [];
  List<CartLine> cart = [];
  Set<String> wishlist = {};
  List<HouseOrder> orders = [];
  String? coupon;
  bool ready = false;

  Product? find(String id) {
    for (final product in products) {
      if (product.id == id) return product;
    }
    return null;
  }

  int get count => cart.fold(0, (sum, line) => sum + line.qty);

  double get subtotal {
    var total = 0.0;
    for (final line in cart) {
      final product = find(line.productId);
      if (product != null) total += product.price * line.qty;
    }
    return total;
  }

  double get discount => discountFor(subtotal, coupon);

  double totalFor(String method) {
    final goods = subtotal - discount;
    return goods + shippingFor(goods, method);
  }

  Future<void> load() async {
    final raw = await rootBundle.loadString('assets/catalog.json');
    final data = jsonDecode(raw) as Map<String, dynamic>;
    products = (data['products'] as List)
        .map((item) => Product.fromJson(Map<String, dynamic>.from(item as Map)))
        .toList();
    hero = Map<String, String>.from(data['hero'] as Map);
    testimonials = (data['testimonials'] as List)
        .map(
          (item) => Map<String, String>.from(
            (item as Map).map(
              (key, value) => MapEntry(key.toString(), value.toString()),
            ),
          ),
        )
        .toList();
    final prefs = await SharedPreferences.getInstance();
    cart = _readList(prefs, 'cart').map(CartLine.fromJson).toList();
    wishlist = _readStrings(prefs, 'wishlist').toSet();
    orders = _readList(prefs, 'orders').map(HouseOrder.fromJson).toList();
    coupon = prefs.getString('coupon');
    ready = true;
    notifyListeners();
  }

  void addToCart(
    Product product, {
    required String size,
    required String color,
  }) {
    if (product.soldOut) return;
    final existing = cart.where(
      (line) =>
          line.productId == product.id &&
          line.size == size &&
          line.color == color,
    );
    if (existing.isEmpty) {
      cart.add(CartLine(productId: product.id, size: size, color: color));
    } else {
      existing.first.qty += 1;
    }
    notifyListeners();
    _save();
  }

  void setQty(CartLine line, int qty) {
    if (qty <= 0) {
      cart.remove(line);
    } else {
      line.qty = qty;
    }
    notifyListeners();
    _save();
  }

  void toggleSaved(String id) {
    if (!wishlist.add(id)) wishlist.remove(id);
    notifyListeners();
    _save();
  }

  bool saved(String id) => wishlist.contains(id);

  String? applyCoupon(String code) {
    final next = code.trim().toUpperCase();
    if (next != 'AURELLE10' && next != 'ATELIER25')
      return 'That code is not active.';
    coupon = next;
    notifyListeners();
    _save();
    return null;
  }

  void clearCoupon() {
    coupon = null;
    notifyListeners();
    _save();
  }

  HouseOrder placeOrder(String method) {
    final goods = subtotal - discount;
    final order = HouseOrder(
      id: 'AU-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
      placedAt: DateTime.now().toIso8601String(),
      items: cart.map((line) {
        final product = find(line.productId);
        return '${product?.name ?? 'Piece'} · ${line.color} · ${line.size} × ${line.qty}';
      }).toList(),
      total: goods + shippingFor(goods, method),
      method: method,
    );
    orders.insert(0, order);
    cart = [];
    coupon = null;
    notifyListeners();
    _save();
    return order;
  }

  List<Product> where({
    String? gender,
    bool newest = false,
    bool trending = false,
    String query = '',
  }) {
    final q = query.trim().toLowerCase();
    return products.where((product) {
      if (gender != null && product.gender != gender) return false;
      if (newest && !product.newest) return false;
      if (trending && !product.trending) return false;
      if (q.isEmpty) return true;
      return '${product.name} ${product.category} ${product.gender} ${product.fabric}'
          .toLowerCase()
          .contains(q);
    }).toList();
  }

  Future<void> _save() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      'cart',
      jsonEncode(cart.map((line) => line.toJson()).toList()),
    );
    await prefs.setStringList('wishlist', wishlist.toList());
    await prefs.setString(
      'orders',
      jsonEncode(orders.map((order) => order.toJson()).toList()),
    );
    if (coupon == null) {
      await prefs.remove('coupon');
    } else {
      await prefs.setString('coupon', coupon!);
    }
  }

  List<Map<String, dynamic>> _readList(SharedPreferences prefs, String key) {
    final raw = prefs.getString(key);
    if (raw == null || raw.isEmpty) return [];
    final decoded = jsonDecode(raw);
    if (decoded is! List) return [];
    return decoded
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();
  }

  List<String> _readStrings(SharedPreferences prefs, String key) =>
      prefs.getStringList(key) ?? [];
}

class ShopScope extends InheritedNotifier<Shop> {
  const ShopScope({required Shop shop, required super.child, super.key})
    : super(notifier: shop);

  static Shop of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<ShopScope>();
    assert(scope?.notifier != null, 'ShopScope is missing');
    return scope!.notifier!;
  }
}
