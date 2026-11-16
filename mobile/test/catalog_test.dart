import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/src/models.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('the mobile catalog is the house catalog', () async {
    final raw = await rootBundle.loadString('assets/catalog.json');
    final data = jsonDecode(raw) as Map<String, dynamic>;
    final products = (data['products'] as List)
        .map((item) => Product.fromJson(Map<String, dynamic>.from(item as Map)))
        .toList();
    expect(products.length, 35);
    expect(
      products.any(
        (product) => product.name == 'Merino Crew' && product.price == 68,
      ),
      isTrue,
    );
    expect(products.any((product) => product.name == 'Crimson Gown'), isTrue);
  });
}
